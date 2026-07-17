import { createContext, useContext, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    welcome: "Welcome back",
    total_savings: "Total Savings",
    this_month: "This Month",
    this_week: "This Week",
    loan_balance: "Loan Balance",
    quick_actions: "Quick Actions",
    apply_loan: "Apply for Loan",
    notify_deposit: "Notify a Deposit",
    withdraw: "Request Withdrawal",
    my_statement: "My Statement",
    recent_transactions: "Recent Transactions",
    notifications: "Notifications",
    repayment_reminders: "Repayment Reminders",
    member_no: "Member",
    logout: "Logout",
    confirm_savings: "Confirm Record Savings",
    savings_receipt: "Savings Receipt",
    apply_loan_sub: "Check eligibility & apply",
    notify_deposit_sub: "Report mobile money payment",
    withdraw_sub: "Withdraw your savings",
    my_statement_sub: "View full history",
    view_all: "View all",
    no_transactions: "No transactions this month",
    loan_requests: "Loan Requests",
    apply_another: "Apply for another",
    confirmed_bal: "Confirmed balance",
    month_to_date: "Month-to-date",
    week_deposits: "Week deposits",
    outstanding: "Outstanding",
    active_loan: "Active Loan",
    remaining: "Remaining",
    due: "Due",
    installment: "installment",
    last_updated: "Last updated",
  },
  ny: { // Runyankore
    welcome: "Kare kasingye",
    total_savings: "Entasya Yoona",
    this_month: "Okwezi Oku",
    this_week: "Esande Egi",
    loan_balance: "Ishashura y'Obusingasinge",
    quick_actions: "Ebyokukora Ahonaaha",
    apply_loan: "Saba Obusingasinge",
    notify_deposit: "Manya Entasya",
    withdraw: "Iha Omubaro",
    my_statement: "Ebitabo Byangye",
    recent_transactions: "Ebyakozirwe Hasaaha",
    notifications: "Ebirangiriro",
    repayment_reminders: "Ebijukuso by'okushashura",
    member_no: "Omukiiko",
    logout: "Rugaamu",
    confirm_savings: "Hamyamu Entasya Egi",
    savings_receipt: "Resiti y'Entasya",
    apply_loan_sub: "Reeba ekikwataho obusingasinge basaba",
    notify_deposit_sub: "Manyisa efeza ezoterekyire aha simu",
    withdraw_sub: "Ihamu efeza zo ezoterekyire",
    my_statement_sub: "Reeba ebyakozirwe byona",
    view_all: "Reeba byona",
    no_transactions: "Ebyakozirwe omu kwezi oku tibiriho",
    loan_requests: "Obusingasinge obushebiirwe",
    apply_another: "Saba obundi busingasinge",
    confirmed_bal: "Efeza ezihekiirwe",
    month_to_date: "Okwezi oku kuhika hati",
    week_deposits: "Entasya y'esande egi",
    outstanding: "Obubanja oburiho",
    active_loan: "Obusingasinge oburiho hati",
    remaining: "Ekisigaireho",
    due: "Ebiro by'okushashura",
    installment: "omubaro gw'okushashura",
    last_updated: "Hasaaha ebihindwirwe",
  },
  lg: { // Luganda
    welcome: "Kulikaayo",
    total_savings: "Ekitereko Kyonna",
    this_month: "Omwezi Guno",
    this_week: "Wiki Eno",
    loan_balance: "Ebbanja",
    quick_actions: "Ebyokukola Amangu",
    apply_loan: "Saba Ekitundu",
    notify_deposit: "Tegeeza ku Kitereko",
    withdraw: "Saba Okuggyayo",
    my_statement: "Ebyafaayo Byange",
    recent_transactions: "Ebyakakolebwa",
    notifications: "Ebirango",
    repayment_reminders: "Ebijukizo by'okusasula",
    member_no: "Ommemba",
    logout: "Fuluma",
    confirm_savings: "Kakasa Ekitereko",
    savings_receipt: "Lisiiti y'Ekitereko",
    apply_loan_sub: "Kebera ebikukwatako osubole okusaba",
    notify_deposit_sub: "Tegeza ku sente zo’ssimu eziterekeddwa",
    withdraw_sub: "Ggyamu ku sente zo eziterekeddwa",
    my_statement_sub: "Laba ebyafaayo ebijjuvu",
    view_all: "Laba byonna",
    no_transactions: "Tewali bikolebwa mu mwezi guno",
    loan_requests: "Okusaba kw'Ebiwola",
    apply_another: "Saba ekirala",
    confirmed_bal: "Sente ezikakasiddwa",
    month_to_date: "Okuva ku ntandikwa y'omwezi",
    week_deposits: "Ebitereko bya wiki eno",
    outstanding: "Ebbanja erisigadde",
    active_loan: "Ekiwola ekiriwo",
    remaining: "Ekisigadde",
    due: "Okusasula ku",
    installment: "okusasula",
    last_updated: "Kyakyusiddwa luno",
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('bodax_lang') || 'en');

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('bodax_lang', newLang);
  };

  const value = useMemo(() => ({ lang, t, changeLanguage }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
