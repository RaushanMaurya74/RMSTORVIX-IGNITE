<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">CUSTOMERS & VENDORS</p>
    <h1>Parties & Contact Directory <span>♙</span></h1>
    <p class="subheading">Sundry Debtors, Sundry Creditors, GSTIN compliance, and credit limits.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-primary" id="openNewPartyBtn">＋ Add New Party</button>
  </div>
</section>

<section class="panel">
  <div class="panel-heading">
    <div class="search-filters">
      <input type="text" id="partySearch" placeholder="Search name, phone, GSTIN..." class="table-search">
      <select id="partyTypeFilter" aria-label="Filter party type">
        <option value="ALL">All Parties</option>
        <option value="CUSTOMER">Customers (Debtors)</option>
        <option value="SUPPLIER">Suppliers (Creditors)</option>
      </select>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>PARTY NAME</th>
          <th>TYPE</th>
          <th>COMPANY</th>
          <th>GSTIN</th>
          <th>PHONE</th>
          <th>CITY / STATE</th>
          <th>CURRENT BALANCE</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody id="partiesTableBody">
        <tr><td colspan="8" class="text-center">Loading party accounts...</td></tr>
      </tbody>
    </table>
  </div>
</section>
