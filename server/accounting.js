// RMSTORVIX IGNITE — Double-Entry Accounting Engine & GST Tax Rules
// Follows Tally ERP 9 Accounting Workflows & Indian GST Statutory Structure

const { getDb, transaction } = require('./db');

// Initialize Standard Chart of Accounts for a new Business Tenant
function initChartOfAccounts(businessId) {
  const db = getDb();
  const accounts = [
    // ASSETS
    { code: '1010', name: 'Cash in Hand', type: 'ASSET', is_system: 1 },
    { code: '1020', name: 'Bank Current Account', type: 'ASSET', is_system: 1 },
    { code: '1030', name: 'Accounts Receivable (Debtors)', type: 'ASSET', is_system: 1 },
    { code: '1040', name: 'Inventory Asset', type: 'ASSET', is_system: 1 },
    { code: '1050', name: 'Input CGST (Tax Credit)', type: 'ASSET', is_system: 1 },
    { code: '1051', name: 'Input SGST (Tax Credit)', type: 'ASSET', is_system: 1 },
    { code: '1052', name: 'Input IGST (Tax Credit)', type: 'ASSET', is_system: 1 },

    // LIABILITIES
    { code: '2010', name: 'Accounts Payable (Creditors)', type: 'LIABILITY', is_system: 1 },
    { code: '2020', name: 'Output CGST Payable', type: 'LIABILITY', is_system: 1 },
    { code: '2021', name: 'Output SGST Payable', type: 'LIABILITY', is_system: 1 },
    { code: '2022', name: 'Output IGST Payable', type: 'LIABILITY', is_system: 1 },
    { code: '2030', name: 'Duties & Taxes Payable', type: 'LIABILITY', is_system: 1 },

    // EQUITY
    { code: '3010', name: "Owner's Capital", type: 'EQUITY', is_system: 1 },
    { code: '3020', name: 'Retained Earnings', type: 'EQUITY', is_system: 1 },

    // REVENUE
    { code: '4010', name: 'Sales Revenue', type: 'REVENUE', is_system: 1 },
    { code: '4020', name: 'Service Revenue', type: 'REVENUE', is_system: 1 },
    { code: '4030', name: 'Other Income', type: 'REVENUE', is_system: 1 },

    // EXPENSES
    { code: '5010', name: 'Purchase / COGS', type: 'EXPENSE', is_system: 1 },
    { code: '5020', name: 'Rent Expense', type: 'EXPENSE', is_system: 1 },
    { code: '5030', name: 'Salaries & Staff Welfare', type: 'EXPENSE', is_system: 1 },
    { code: '5040', name: 'Electricity & Utilities', type: 'EXPENSE', is_system: 1 },
    { code: '5050', name: 'Office & Admin Expenses', type: 'EXPENSE', is_system: 1 },
    { code: '5060', name: 'Freight & Transportation', type: 'EXPENSE', is_system: 1 },
    { code: '5070', name: 'Discount Allowed', type: 'EXPENSE', is_system: 1 },
    { code: '5080', name: 'General Business Expenses', type: 'EXPENSE', is_system: 1 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO accounts (business_id, account_code, account_name, account_type, is_system, opening_balance, current_balance)
    VALUES (?, ?, ?, ?, ?, 0.00, 0.00)
  `);

  for (const acc of accounts) {
    stmt.run(businessId, acc.code, acc.name, acc.type, acc.is_system);
  }
}

// Get account by code for a business
function getAccountByCode(businessId, code) {
  const db = getDb();
  return db.prepare('SELECT * FROM accounts WHERE business_id = ? AND account_code = ?').get(businessId, code);
}

// Post a balanced journal entry
// lines: [ { accountCode: '1010', debit: 100, credit: 0, description: '...' }, ... ]
function postJournalEntry(businessId, entryNumber, entryDate, referenceType, referenceId, narration, lines, createdBy = null) {
  return transaction((db) => {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += Math.round((Number(line.debit) || 0) * 100);
      totalCredit += Math.round((Number(line.credit) || 0) * 100);
    }

    if (totalDebit !== totalCredit) {
      throw new Error(`Double-entry balance check failed! Debits (${totalDebit / 100}) must equal Credits (${totalCredit / 100})`);
    }

    const totalAmount = totalDebit / 100;

    const entryResult = db.prepare(`
      INSERT INTO journal_entries (business_id, entry_number, entry_date, reference_type, reference_id, narration, total_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(businessId, entryNumber, entryDate, referenceType, referenceId, narration, totalAmount, createdBy);

    const entryId = entryResult.lastInsertRowid;

    for (const line of lines) {
      let account = getAccountByCode(businessId, line.accountCode);
      if (!account) {
        throw new Error(`Account code ${line.accountCode} not found for business`);
      }

      const d = Number(line.debit) || 0;
      const c = Number(line.credit) || 0;

      db.prepare(`
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(entryId, account.id, d, c, line.description || narration);

      // Update account current_balance
      // Assets & Expenses increase on Debit, decrease on Credit
      // Liabilities, Equity & Revenue increase on Credit, decrease on Debit
      let delta = 0;
      if (['ASSET', 'EXPENSE'].includes(account.account_type)) {
        delta = d - c;
      } else {
        delta = c - d;
      }

      db.prepare(`
        UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?
      `).run(delta, account.id);
    }

    return entryId;
  });
}

// Post Invoice to General Ledger
function postInvoiceToAccounting(businessId, invoice, createdBy = null) {
  const isInterstate = Boolean(invoice.is_interstate);
  const lines = [];

  // Debit: Accounts Receivable (or Cash if fully paid upfront)
  lines.push({
    accountCode: '1030', // Accounts Receivable
    debit: invoice.grand_total,
    credit: 0,
    description: `Invoice ${invoice.invoice_number}`
  });

  // Credit: Sales Revenue
  lines.push({
    accountCode: '4010', // Sales Revenue
    debit: 0,
    credit: invoice.subtotal,
    description: `Sales revenue for ${invoice.invoice_number}`
  });

  // Taxes
  if (isInterstate && invoice.igst_amount > 0) {
    lines.push({
      accountCode: '2022', // Output IGST
      debit: 0,
      credit: invoice.igst_amount,
      description: `IGST on ${invoice.invoice_number}`
    });
  } else {
    if (invoice.cgst_amount > 0) {
      lines.push({
        accountCode: '2020', // Output CGST
        debit: 0,
        credit: invoice.cgst_amount,
        description: `CGST on ${invoice.invoice_number}`
      });
    }
    if (invoice.sgst_amount > 0) {
      lines.push({
        accountCode: '2021', // Output SGST
        debit: 0,
        credit: invoice.sgst_amount,
        description: `SGST on ${invoice.invoice_number}`
      });
    }
  }

  // Round off adjustment if any
  if (invoice.round_off !== 0) {
    if (invoice.round_off > 0) {
      lines.push({
        accountCode: '4030', // Other Income
        debit: 0,
        credit: invoice.round_off,
        description: 'Invoice round-off'
      });
    } else {
      lines.push({
        accountCode: '5070', // Discount / Round-off expense
        debit: Math.abs(invoice.round_off),
        credit: 0,
        description: 'Invoice round-off'
      });
    }
  }

  const entryNumber = `JV-INV-${invoice.invoice_number}`;
  return postJournalEntry(
    businessId,
    entryNumber,
    invoice.invoice_date,
    'INVOICE',
    invoice.id,
    `Sales Invoice ${invoice.invoice_number}`,
    lines,
    createdBy
  );
}

// Post Payment Receipt to General Ledger
function postReceiptToAccounting(businessId, payment, createdBy = null) {
  const assetAccount = payment.payment_mode === 'CASH' ? '1010' : '1020'; // Cash vs Bank
  const lines = [
    {
      accountCode: assetAccount,
      debit: payment.amount,
      credit: 0,
      description: `Receipt ${payment.voucher_number} via ${payment.payment_mode}`
    },
    {
      accountCode: '1030', // Accounts Receivable
      debit: 0,
      credit: payment.amount,
      description: `Payment from customer for ${payment.voucher_number}`
    }
  ];

  const entryNumber = `RV-${payment.voucher_number}`;
  return postJournalEntry(
    businessId,
    entryNumber,
    payment.payment_date,
    'PAYMENT_RECEIPT',
    payment.id,
    `Receipt Voucher ${payment.voucher_number}`,
    lines,
    createdBy
  );
}

// Post Purchase Bill to General Ledger
function postPurchaseBillToAccounting(businessId, bill, createdBy = null) {
  const lines = [
    {
      accountCode: '5010', // Purchase / COGS
      debit: bill.subtotal,
      credit: 0,
      description: `Purchases on bill ${bill.bill_number}`
    }
  ];

  if (bill.igst_amount > 0) {
    lines.push({
      accountCode: '1052', // Input IGST
      debit: bill.igst_amount,
      credit: 0,
      description: `Input IGST on ${bill.bill_number}`
    });
  } else {
    if (bill.cgst_amount > 0) {
      lines.push({
        accountCode: '1050', // Input CGST
        debit: bill.cgst_amount,
        credit: 0,
        description: `Input CGST on ${bill.bill_number}`
      });
    }
    if (bill.sgst_amount > 0) {
      lines.push({
        accountCode: '1051', // Input SGST
        debit: bill.sgst_amount,
        credit: 0,
        description: `Input SGST on ${bill.bill_number}`
      });
    }
  }

  if (bill.round_off !== 0) {
    if (bill.round_off < 0) {
      lines.push({
        accountCode: '4030', // Discount received
        debit: 0,
        credit: Math.abs(bill.round_off),
        description: 'Purchase bill round-off'
      });
    } else {
      lines.push({
        accountCode: '5070',
        debit: bill.round_off,
        credit: 0,
        description: 'Purchase bill round-off'
      });
    }
  }

  // Credit: Accounts Payable
  lines.push({
    accountCode: '2010', // Accounts Payable
    debit: 0,
    credit: bill.grand_total,
    description: `Payable for bill ${bill.bill_number}`
  });

  const entryNumber = `JV-PUR-${bill.bill_number}`;
  return postJournalEntry(
    businessId,
    entryNumber,
    bill.bill_date,
    'PURCHASE_BILL',
    bill.id,
    `Purchase Bill ${bill.bill_number}`,
    lines,
    createdBy
  );
}

// Post Supplier Payment to General Ledger
function postSupplierPaymentToAccounting(businessId, payment, createdBy = null) {
  const assetAccount = payment.payment_mode === 'CASH' ? '1010' : '1020';
  const lines = [
    {
      accountCode: '2010', // Accounts Payable
      debit: payment.amount,
      credit: 0,
      description: `Payment to supplier ${payment.voucher_number}`
    },
    {
      accountCode: assetAccount,
      debit: 0,
      credit: payment.amount,
      description: `Payment ${payment.voucher_number} via ${payment.payment_mode}`
    }
  ];

  const entryNumber = `PV-${payment.voucher_number}`;
  return postJournalEntry(
    businessId,
    entryNumber,
    payment.payment_date,
    'SUPPLIER_PAYMENT',
    payment.id,
    `Payment Voucher ${payment.voucher_number}`,
    lines,
    createdBy
  );
}

// Generate Trial Balance Report
function getTrialBalance(businessId) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT a.id, a.account_code, a.account_name, a.account_type,
           COALESCE(SUM(jl.debit), 0) AS total_debit,
           COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM accounts a
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    WHERE a.business_id = ?
    GROUP BY a.id
    ORDER BY a.account_code ASC
  `).all(businessId);

  let grandDebit = 0;
  let grandCredit = 0;

  const accounts = rows.map((r) => {
    const netDebit = r.total_debit > r.total_credit ? r.total_debit - r.total_credit : 0;
    const netCredit = r.total_credit > r.total_debit ? r.total_credit - r.total_debit : 0;
    grandDebit += netDebit;
    grandCredit += netCredit;

    return {
      ...r,
      net_debit: netDebit,
      net_credit: netCredit
    };
  });

  return {
    accounts,
    total_debit: Math.round(grandDebit * 100) / 100,
    total_credit: Math.round(grandCredit * 100) / 100,
    is_balanced: Math.abs(grandDebit - grandCredit) < 0.01
  };
}

// Generate Profit & Loss Report
function getProfitAndLoss(businessId, startDate = null, endDate = null) {
  const db = getDb();
  let dateFilter = '';
  const params = [businessId];

  if (startDate && endDate) {
    dateFilter = ' AND je.entry_date BETWEEN ? AND ? ';
    params.push(startDate, endDate);
  }

  const rows = db.prepare(`
    SELECT a.account_code, a.account_name, a.account_type,
           COALESCE(SUM(jl.debit), 0) AS debit,
           COALESCE(SUM(jl.credit), 0) AS credit
    FROM accounts a
    JOIN journal_lines jl ON jl.account_id = a.id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE a.business_id = ? AND a.account_type IN ('REVENUE', 'EXPENSE') ${dateFilter}
    GROUP BY a.id
    ORDER BY a.account_code ASC
  `).all(...params);

  let totalRevenue = 0;
  let totalExpense = 0;
  const revenues = [];
  const expenses = [];

  for (const r of rows) {
    if (r.account_type === 'REVENUE') {
      const net = r.credit - r.debit;
      totalRevenue += net;
      revenues.push({ name: r.account_name, code: r.account_code, amount: net });
    } else {
      const net = r.debit - r.credit;
      totalExpense += net;
      expenses.push({ name: r.account_name, code: r.account_code, amount: net });
    }
  }

  const netProfit = totalRevenue - totalExpense;

  return {
    revenues,
    expenses,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_expense: Math.round(totalExpense * 100) / 100,
    net_profit: Math.round(netProfit * 100) / 100
  };
}

// Generate Balance Sheet Report
function getBalanceSheet(businessId) {
  const db = getDb();
  const pnl = getProfitAndLoss(businessId);

  const rows = db.prepare(`
    SELECT a.account_code, a.account_name, a.account_type,
           COALESCE(SUM(jl.debit), 0) AS debit,
           COALESCE(SUM(jl.credit), 0) AS credit
    FROM accounts a
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    WHERE a.business_id = ? AND a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    GROUP BY a.id
    ORDER BY a.account_code ASC
  `).all(businessId);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  const assets = [];
  const liabilities = [];
  const equities = [];

  for (const r of rows) {
    if (r.account_type === 'ASSET') {
      const bal = r.debit - r.credit;
      totalAssets += bal;
      assets.push({ name: r.account_name, code: r.account_code, amount: bal });
    } else if (r.account_type === 'LIABILITY') {
      const bal = r.credit - r.debit;
      totalLiabilities += bal;
      liabilities.push({ name: r.account_name, code: r.account_code, amount: bal });
    } else if (r.account_type === 'EQUITY') {
      const bal = r.credit - r.debit;
      totalEquity += bal;
      equities.push({ name: r.account_name, code: r.account_code, amount: bal });
    }
  }

  // Include Current Period Profit in Equity
  equities.push({ name: 'Net Profit (Current Period)', code: 'RETAINED', amount: pnl.net_profit });
  totalEquity += pnl.net_profit;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets,
    liabilities,
    equities,
    total_assets: Math.round(totalAssets * 100) / 100,
    total_liabilities: Math.round(totalLiabilities * 100) / 100,
    total_equity: Math.round(totalEquity * 100) / 100,
    total_liabilities_and_equity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
    is_balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.02
  };
}

// Day Book: Chronological listing of all vouchers like Tally
function getDayBook(businessId, date = null) {
  const db = getDb();
  const queryDate = date || new Date().toISOString().slice(0, 10);

  return db.prepare(`
    SELECT je.id, je.entry_number, je.entry_date, je.reference_type, je.reference_id, je.narration, je.total_amount,
           u.full_name AS created_by_name
    FROM journal_entries je
    LEFT JOIN users u ON u.id = je.created_by
    WHERE je.business_id = ? AND je.entry_date = ?
    ORDER BY je.id DESC
  `).all(businessId, queryDate);
}

// Indian GST Tax Calculation Helper
function calculateItemGST(rate, qty, discountPercent, taxRate, isInterstate, isInclusive = false) {
  const gross = Math.round(rate * qty * 100) / 100;
  const discountAmount = Math.round((gross * (discountPercent / 100)) * 100) / 100;
  let taxableAmount = gross - discountAmount;

  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalAmount = 0;

  if (isInclusive && taxRate > 0) {
    taxableAmount = Math.round((taxableAmount / (1 + (taxRate / 100))) * 100) / 100;
    taxAmount = Math.round((gross - discountAmount - taxableAmount) * 100) / 100;
  } else {
    taxAmount = Math.round((taxableAmount * (taxRate / 100)) * 100) / 100;
  }

  totalAmount = taxableAmount + taxAmount;

  if (isInterstate) {
    igstAmount = taxAmount;
  } else {
    cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
    sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
  }

  return {
    gross,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount
  };
}

module.exports = {
  initChartOfAccounts,
  getAccountByCode,
  postJournalEntry,
  postInvoiceToAccounting,
  postReceiptToAccounting,
  postPurchaseBillToAccounting,
  postSupplierPaymentToAccounting,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getDayBook,
  calculateItemGST
};
