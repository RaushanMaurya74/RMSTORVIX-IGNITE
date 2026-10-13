<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">DOUBLE-ENTRY ACCOUNTING</p>
    <h1>General Ledger & Day Book <span>◎</span></h1>
    <p class="subheading">Tally ERP 9 accounting vouchers, Trial Balance, and Account Ledgers.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-primary" onclick="showNewVoucherModal()">＋ Record Voucher (F7)</button>
  </div>
</section>

<section class="panel">
  <div class="panel-heading">
    <div class="search-filters">
      <input type="date" id="dayBookDate" class="table-search" value="<?= date('Y-m-d') ?>">
      <select id="voucherTypeFilter" aria-label="Filter voucher type">
        <option value="ALL">All Voucher Types</option>
        <option value="SALES">Sales (F8)</option>
        <option value="PURCHASE">Purchase (F9)</option>
        <option value="RECEIPT">Receipt (F6)</option>
        <option value="PAYMENT">Payment (F5)</option>
        <option value="JOURNAL">Journal (F7)</option>
        <option value="CONTRA">Contra (F4)</option>
      </select>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>VOUCHER #</th>
          <th>DATE</th>
          <th>TYPE</th>
          <th>NARRATION / PARTICULARS</th>
          <th>DEBIT (₹)</th>
          <th>CREDIT (₹)</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody id="dayBookTableBody">
        <tr><td colspan="7" class="text-center">Loading Day Book vouchers...</td></tr>
      </tbody>
    </table>
  </div>
</section>
