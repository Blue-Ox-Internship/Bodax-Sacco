import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const LOAN_SAVINGS_MULTIPLIER = 3;

function calculateLoan({ principal, interest_rate = 10, installment_count = 4 }) {
  const interestAmount = Number(principal) * (Number(interest_rate) / 100);
  const totalPayable = Number(principal) + interestAmount;
  return {
import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export const ELIGIBILITY_RULES = {
  MIN_MEMBERSHIP_DAYS: 30, // Must be registered for at least 30 days
  MIN_SAVINGS_TRANSACTIONS: 3, // Must have saved at least 3 distinct times
  BASE_SAVINGS_MULTIPLIER: 3, // Standard multiplier
  GOOD_HISTORY_MULTIPLIER: 4, // Multiplier if they have completed loans on time
  POOR_HISTORY_MULTIPLIER: 1.5, // Multiplier if they have previously paid loans late
};

function calculateLoan({ principal, interest_rate = 10, installment_count = 4 }) {
  const interestAmount = Number(principal) * (Number(interest_rate) / 100);
  const totalPayable = Number(principal) + interestAmount;
  return {
    interest_amount: interestAmount,
    total_payable: totalPayable,
    installment_amount: totalPayable / Number(installment_count),
  };
}

export async function refreshOverdueLoans(saccoId) {
  await query(
    `UPDATE loans l SET status = 'overdue', updated_at = NOW()
     WHERE l.sacco_id = $1
       AND l.status = 'active'
       AND l.due_date < CURRENT_DATE
       AND l.total_payable > COALESCE(
         (SELECT SUM(amount) FROM loan_repayments r WHERE r.loan_id = l.id AND r.sacco_id = $1), 0
       )`,
    [saccoId]
  );
}

export async function checkLoanEligibility(saccoId, memberId, requestedAmount = null, options = {}) {
  const memberResult = await query(
    \`SELECT status, registration_date, 
            CURRENT_DATE - registration_date AS days_registered
     FROM members WHERE sacco_id = $1 AND id = $2\`, 
    [saccoId, memberId]
  );
  const member = memberResult.rows[0];
  if (!member) throw new AppError('Member not found', 404);

  const savingsResult = await query(
    \`SELECT 
       GREATEST(
         COALESCE((
           SELECT SUM(amount) FROM savings_transactions
           WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true
         ), 0) - COALESCE((
           SELECT SUM(amount) FROM withdrawals
           WHERE sacco_id = $1 AND member_id = $2
         ), 0),
         0
       ) AS total,
       COALESCE((
         SELECT COUNT(*) FROM savings_transactions
         WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true
       ), 0) AS transaction_count
    \`,
    [saccoId, memberId],
  );
  const totalSavings = Number(savingsResult.rows[0].total);
  const savingsTransactionsCount = Number(savingsResult.rows[0].transaction_count);

  // Analyze Repayment History
  const historyResult = await query(
    \`SELECT 
       COUNT(*) AS total_past_loans,
       COUNT(CASE WHEN (SELECT MAX(payment_date) FROM loan_repayments r WHERE r.loan_id = l.id) > l.due_date THEN 1 END) AS late_past_loans
     FROM loans l
     WHERE l.sacco_id = $1 AND l.member_id = $2 AND l.status = 'completed'\`,
    [saccoId, memberId]
  );
  const pastLoans = Number(historyResult.rows[0].total_past_loans);
  const latePastLoans = Number(historyResult.rows[0].late_past_loans);

  let currentMultiplier = ELIGIBILITY_RULES.BASE_SAVINGS_MULTIPLIER;
  if (pastLoans > 0) {
    if (latePastLoans === 0) {
      currentMultiplier = ELIGIBILITY_RULES.GOOD_HISTORY_MULTIPLIER; // Reward good history
    } else if (latePastLoans >= pastLoans / 2) {
      currentMultiplier = ELIGIBILITY_RULES.POOR_HISTORY_MULTIPLIER; // Penalize bad history
    }
  }

  const maxEligible = totalSavings * currentMultiplier;

  // Rule 1: Member Status
  if (member.status !== 'active') {
    return { eligible: false, reason: 'Your member account is not active', max_eligible_amount: maxEligible, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 2: Membership Duration
  if (member.days_registered < ELIGIBILITY_RULES.MIN_MEMBERSHIP_DAYS) {
    return { eligible: false, reason: \`Must be a registered member for at least \${ELIGIBILITY_RULES.MIN_MEMBERSHIP_DAYS} days\`, max_eligible_amount: 0, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 3: Savings Consistency
  if (savingsTransactionsCount < ELIGIBILITY_RULES.MIN_SAVINGS_TRANSACTIONS) {
    return { eligible: false, reason: \`Must have at least \${ELIGIBILITY_RULES.MIN_SAVINGS_TRANSACTIONS} confirmed savings transactions\`, max_eligible_amount: 0, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 4: Total Savings
  if (totalSavings <= 0) {
    return { eligible: false, reason: 'You need confirmed savings before applying for a loan', max_eligible_amount: 0, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 5: Active Loans
  const activeLoans = await listLoans({ saccoId, memberId });
  const hasActiveLoan = activeLoans.some((loan) => ['active', 'overdue'].includes(loan.status));
  if (hasActiveLoan) {
    return { eligible: false, reason: 'You already have an active or overdue loan', max_eligible_amount: maxEligible, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 6: Pending Requests
  const pendingParams = [saccoId, memberId];
  let pendingSql = \`SELECT id FROM loan_requests WHERE sacco_id = $1 AND member_id = $2 AND status = 'pending'\`;
  if (options.excludeRequestId) {
    pendingParams.push(options.excludeRequestId);
    pendingSql += \` AND id <> $\${pendingParams.length}\`;
  }
  const pendingRequest = await query(pendingSql, pendingParams);
  if (pendingRequest.rows.length) {
    return { eligible: false, reason: 'You already have a pending loan request', max_eligible_amount: maxEligible, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  // Rule 7: Requested Amount vs Max Eligible
  if (requestedAmount !== null && Number(requestedAmount) > maxEligible) {
    return { eligible: false, reason: \`Requested amount exceeds your maximum eligible amount (\${maxEligible.toLocaleString()} UGX - \${currentMultiplier}x your confirmed savings)\`, max_eligible_amount: maxEligible, total_savings: totalSavings, savings_multiplier: currentMultiplier };
  }

  return {
    eligible: true,
    reason: \`Eligible to borrow up to \${maxEligible.toLocaleString()} UGX (\${currentMultiplier}x your confirmed savings)\`,
    max_eligible_amount: maxEligible,
    total_savings: totalSavings,
    savings_multiplier: currentMultiplier,
  };
}

export async function createLoanRequest(saccoId, payload) {
  const eligibility = await checkLoanEligibility(saccoId, payload.member_id, payload.requested_amount);
  if (!eligibility.eligible) {
    throw new AppError(eligibility.reason, 400);
  }

  const { rows } = await query(
    `INSERT INTO loan_requests
      (sacco_id, member_id, requested_amount, purpose, installment_count, due_date,
       eligibility_status, eligibility_reason, max_eligible_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      saccoId,
      payload.member_id,
      payload.requested_amount,
      payload.purpose || null,
      payload.installment_count ?? 4,
      payload.due_date,
      eligibility.eligible ? 'eligible' : 'ineligible',
      eligibility.reason,
      eligibility.max_eligible_amount,
    ],
  );
  return { request: rows[0], eligibility };
}

export async function listLoanRequests({ saccoId, status, memberId } = {}) {
  const params = [saccoId];
  const filters = ['lr.sacco_id = $1'];
  if (status) {
    params.push(status);
    filters.push(`lr.status = $${params.length}`);
  }
  if (memberId) {
    params.push(memberId);
    filters.push(`lr.member_id = $${params.length}`);
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  const { rows } = await query(
    `SELECT lr.*, m.full_name, m.member_number,
            GREATEST(
              COALESCE((
                SELECT SUM(s.amount) FROM savings_transactions s
                WHERE s.sacco_id = lr.sacco_id AND s.member_id = lr.member_id AND s.confirmed = true
              ), 0) - COALESCE((
                SELECT SUM(w.amount) FROM withdrawals w
                WHERE w.sacco_id = lr.sacco_id AND w.member_id = lr.member_id
              ), 0),
              0
            ) AS total_savings
     FROM loan_requests lr
     JOIN members m ON m.id = lr.member_id
     ${where}
     ORDER BY lr.requested_at DESC`,
    params,
  );
  return rows;
}

export async function reviewLoanRequest(saccoId, id, action, reviewedBy, notes = null) {
  return transaction(async (client) => {
    const found = await client.query('SELECT * FROM loan_requests WHERE sacco_id = $1 AND id = $2 FOR UPDATE', [saccoId, id]);
    const request = found.rows[0];
    if (!request) throw new AppError('Loan request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request has already been reviewed', 409);

    if (action === 'approve') {
      if (request.eligibility_status !== 'eligible') {
        throw new AppError('Cannot approve an ineligible loan request', 400);
      }

      const eligibility = await checkLoanEligibility(saccoId, request.member_id, request.requested_amount, { excludeRequestId: id });
      if (!eligibility.eligible) {
        throw new AppError(eligibility.reason, 400);
      }

      const calculated = calculateLoan({
        principal: request.requested_amount,
        installment_count: request.installment_count,
      });

      const loanResult = await client.query(
        `INSERT INTO loans
          (sacco_id, member_id, issued_by, principal, interest_rate, interest_amount, total_payable,
           installment_count, installment_amount, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          saccoId,
          request.member_id,
          reviewedBy,
          request.requested_amount,
          10,
          calculated.interest_amount,
          calculated.total_payable,
          request.installment_count,
          calculated.installment_amount,
          request.due_date,
          notes || request.purpose || null,
        ],
      );
      const loan = loanResult.rows[0];

      const reviewed = await client.query(
        `UPDATE loan_requests
         SET status = 'approved', reviewed_by = $3, reviewed_at = NOW(),
             loan_id = $4, updated_at = NOW()
         WHERE sacco_id = $1 AND id = $2
         RETURNING *`,
        [saccoId, id, reviewedBy, loan.id],
      );

      return { request: reviewed.rows[0], loan };
    }

    const reviewed = await client.query(
      `UPDATE loan_requests
       SET status = 'rejected', reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE sacco_id = $1 AND id = $2
       RETURNING *`,
      [saccoId, id, reviewedBy],
    );
    return { request: reviewed.rows[0], loan: null };
  });
}

export async function issueLoan(saccoId, payload, issuedBy) {
  const eligibility = await checkLoanEligibility(saccoId, payload.member_id, payload.principal);
  if (!eligibility.eligible) {
    throw new AppError(eligibility.reason, 400);
  }

  const calculated = calculateLoan(payload);
  const { rows } = await query(
    `INSERT INTO loans
      (sacco_id, member_id, issued_by, principal, interest_rate, interest_amount, total_payable,
       installment_count, installment_amount, issued_date, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, CURRENT_DATE),$11,$12)
     RETURNING *`,
    [
      saccoId,
      payload.member_id,
      issuedBy,
      payload.principal,
      payload.interest_rate ?? 10,
      calculated.interest_amount,
      calculated.total_payable,
      payload.installment_count ?? 4,
      calculated.installment_amount,
      payload.issued_date || null,
      payload.due_date,
      payload.notes || null,
    ],
  );
  return rows[0];
}

export async function refreshLoanStatus(saccoId, client, loanId) {
  const { rows } = await client.query(
    `SELECT l.id, l.total_payable, l.due_date, l.status,
            COALESCE(SUM(r.amount), 0) AS paid
     FROM loans l
     LEFT JOIN loan_repayments r ON r.loan_id = l.id AND r.sacco_id = $1
     WHERE l.sacco_id = $1 AND l.id = $2
     GROUP BY l.id`,
    [saccoId, loanId],
  );
  const loan = rows[0];
  if (!loan) throw new AppError('Loan not found', 404);

  const balance = Number(loan.total_payable) - Number(loan.paid);
  const status = balance <= 0 ? 'completed' : new Date(loan.due_date) < new Date() ? 'overdue' : 'active';

  await client.query('UPDATE loans SET status = $3, updated_at = NOW() WHERE sacco_id = $1 AND id = $2', [saccoId, loanId, status]);
  return { ...loan, remaining_balance: Math.max(balance, 0), status };
}

export async function recordRepayment(saccoId, payload, recordedBy) {
  return transaction(async (client) => {
    const loanResult = await client.query('SELECT * FROM loans WHERE sacco_id = $1 AND id = $2', [saccoId, payload.loan_id]);
    const loan = loanResult.rows[0];
    if (!loan) throw new AppError('Loan not found', 404);

    const repayment = await client.query(
      `INSERT INTO loan_repayments (sacco_id, loan_id, member_id, recorded_by, amount, payment_date, notes)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),$7)
       RETURNING *`,
      [saccoId, payload.loan_id, loan.member_id, recordedBy, payload.amount, payload.payment_date || null, payload.notes || null],
    );

    const summary = await refreshLoanStatus(saccoId, client, payload.loan_id);
    return { repayment: repayment.rows[0], loan: summary };
  });
}

export async function listLoans({ saccoId, memberId, status } = {}) {
  await refreshOverdueLoans(saccoId);

  const params = [saccoId];
  const filters = ['l.sacco_id = $1'];
  if (memberId) {
    params.push(memberId);
    filters.push(`l.member_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    filters.push(`l.status = $${params.length}`);
  }
  const where = `WHERE ${filters.join(' AND ')}`;
  const { rows } = await query(
    `SELECT l.*, m.full_name, m.member_number,
            COALESCE(SUM(r.amount), 0) AS amount_paid,
            GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS remaining_balance
     FROM loans l
     JOIN members m ON m.id = l.member_id
     LEFT JOIN loan_repayments r ON r.loan_id = l.id AND r.sacco_id = l.sacco_id
     ${where}
     GROUP BY l.id, m.full_name, m.member_number
     ORDER BY l.created_at DESC`,
    params,
  );
  return rows;
}

export async function memberActiveLoan(saccoId, memberId) {
  const loans = await listLoans({ saccoId, memberId });
  return loans.find((loan) => ['active', 'overdue'].includes(loan.status)) || null;
}
