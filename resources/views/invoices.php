<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">SALES & RECEIVABLES</p>
    <h1>Tax Invoices & Billing <span>▤</span></h1>
    <p class="subheading">Issue compliant GST invoices, record payments, and manage debtors.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-primary" id="openNewInvoiceBtn">＋ New GST Invoice (F8)</button>
  </div>
</section>

<section class="panel">
  <div class="panel-heading">
    <div class="search-filters">
      <input type="text" id="invoiceSearch" placeholder="Search invoice # or customer..." class="table-search">
      <select id="invoiceStatusFilter" aria-label="Filter status">
        <option value="ALL">All Invoices</option>
        <option value="PAID">Paid</option>
        <option value="PARTIALLY_PAID">Partially Paid</option>
        <option value="UNPAID">Unpaid / Overdue</option>
      </select>
    </div>
    <div>
      <button class="button button-secondary" id="exportInvoicesCsvBtn">Export CSV</button>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>INVOICE NUMBER</th>
          <th>CUSTOMER</th>
          <th>DATE</th>
          <th>TAXABLE</th>
          <th>GST</th>
          <th>GRAND TOTAL</th>
          <th>BALANCE DUE</th>
          <th>STATUS</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody id="invoicesTableBody">
        <tr><td colspan="9" class="text-center">Loading invoices...</td></tr>
      </tbody>
    </table>
  </div>
</section>
