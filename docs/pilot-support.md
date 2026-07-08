# Pilot Support Checklist – Bodax SACCO (Mile 4 Stage Pilot)

This document defines who to contact and what steps to follow for the three most common issues that may arise during the Mile 4 Stage pilot.

---

## Issue 1 – Login Problem (Cannot Access Account)

**Symptoms**: Member or staff cannot log in; sees "Invalid login details" error, or the page does not load.

### Steps to Resolve

1. **Confirm credentials**: Ask the user if they are using their registered phone number (e.g., `0700000001`) or email address as their username.
2. **Check account status**: The Treasurer should log in and go to **Members**, find the member, and confirm their status is **Active** (not Inactive).
3. **Reset password**: If the member has forgotten their password, the Treasurer can go to **Members → [Member Name] → Set Credentials** and assign a new temporary password.
4. **Check connectivity**: Confirm the user's device has internet access and that the Render API is online at `/health`.
5. **Escalate**: If the issue persists after the above steps, contact the **System Administrator (Intern/Developer)** via WhatsApp or email with:
   - The member's full name and member number
   - A screenshot of the error message

**Primary Contact**: Treasurer  
**Escalation Contact**: System Developer / Intern Team

---

## Issue 2 – Payment Dispute (Savings or Repayment Not Showing)

**Symptoms**: A member reports a deposit or loan repayment they made is not reflected in their dashboard or statement.

### Steps to Resolve

1. **Ask for the date and amount**: Get the exact date and amount of the payment from the member.
2. **Check the statement**: The Treasurer should go to **Savings → Statements** and filter by the member and date range to check if the transaction exists.
3. **Check the deposits queue**: Go to **Savings → Confirm Deposits** and verify if the deposit was recorded but not confirmed.
4. **Manual entry**: If the payment is verified through physical receipt or mobile money confirmation, the Treasurer should manually record it via **Record Savings** or **Record Repayment**, noting the correct original date.
5. **Document the dispute**: Record the issue in the SACCO's physical register with the date, amount, and resolution.
6. **Escalate if duplicate**: If a duplicate entry was accidentally created, contact the **System Developer** to remove the duplicate directly from the database.

**Primary Contact**: Treasurer  
**Escalation Contact**: System Developer / Intern Team

---

## Issue 3 – System Error (Application Not Working / Server Error)

**Symptoms**: Users see a blank page, "Server Error", "Network Error", or requests take too long with no response.

### Steps to Resolve

1. **Check the health endpoint**: Open `https://<your-api-url>/health` in a browser. It should return `{ "status": "ok" }`. If it does not, the backend server is down.
2. **Check Render dashboard**: Log in to [render.com](https://render.com) and check the service status. If the service is stopped or failed, click **Manual Deploy → Deploy latest commit** to restart it.
3. **Check error logs**: In the Render dashboard, go to **Logs** to see the latest error output. Common issues:
   - `DATABASE_URL` not set → add it under **Environment Variables**
   - `JWT_SECRET` missing → add it under **Environment Variables**
4. **Check the frontend (Vercel)**: Log in to [vercel.com](https://vercel.com) and verify the client deployment succeeded. If the build failed, redeploy from the dashboard.
5. **Communicate to users**: Notify all active users (Treasurer, Chairman, Members) that the system is temporarily unavailable and give an estimated restoration time.
6. **Escalate**: If the issue cannot be resolved within 30 minutes, contact the **System Developer** immediately.

**Primary Contact**: System Developer / Intern Team  
**Escalation Contact**: Project Supervisor / Internship Coordinator

---

## Quick Contact Reference

| Role | Responsibility | Contact |
|---|---|---|
| Treasurer | Login resets, payment entries | *(Treasurer's phone number)* |
| Chairman | Oversight and decisions | *(Chairman's phone number)* |
| System Developer | Technical errors, database issues | *(Developer's phone/email)* |
| Internship Supervisor | Project escalation | *(Supervisor's contact)* |

> ⚠️ **Note**: Fill in the contact details above before the pilot begins.
