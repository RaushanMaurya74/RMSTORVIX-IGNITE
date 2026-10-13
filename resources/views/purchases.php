<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">PROCUREMENT & INWARD SUPPLIES</p>
    <h1>Purchase Bills & Inward Supplies <span>📥</span></h1>
    <p class="subheading">Vendor bills, purchase orders, inventory stock-in, and accounts payable.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-primary" id="openNewPurchaseBtn">＋ Record Purchase Bill (F9)</button>
  </div>
</section>

<section class="panel">
  <div class="panel-heading">
    <div class="search-filters">
      <input type="text" id="purchaseSearch" placeholder="Search bill # or supplier..." class="table-search">
      <select id="purchaseStatusFilter" aria-label="Filter status">
        <option value="ALL">All Statuses</option>
        <option value="UNPAID">Unpaid</option>
        <option value="PARTIALLY_PAID">Partially Paid</option>
        <option value="PAID">Paid</option>
      </select>
    </div>
    <div>
      <button class="button button-secondary" id="exportPurchasesCsvBtn">Export CSV</button>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>BILL NUMBER</th>
          <th>SUPPLIER</th>
          <th>BILL DATE</th>
          <th>VENDOR REF #</th>
          <th>TAXABLE</th>
          <th>GST</th>
          <th>GRAND TOTAL</th>
          <th>BALANCE DUE</th>
          <th>STATUS</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody id="purchasesTableBody">
        <tr><td colspan="10" class="text-center">Loading purchase bills...</td></tr>
      </tbody>
    </table>
  </div>
</section>
