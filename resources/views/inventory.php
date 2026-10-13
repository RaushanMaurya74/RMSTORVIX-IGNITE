<?php
declare(strict_types=1);
?>
<section class="page-heading">
  <div>
    <p class="eyebrow">WAREHOUSE & CATALOG</p>
    <h1>Item Master & Stock Levels <span>▧</span></h1>
    <p class="subheading">Track physical inventory, SKU variants, reorder levels, and HSN codes.</p>
  </div>
  <div class="heading-actions">
    <button class="button button-primary" id="openNewItemBtn">＋ Add New Product</button>
  </div>
</section>

<section class="panel">
  <div class="panel-heading">
    <div class="search-filters">
      <input type="text" id="inventorySearch" placeholder="Search by name, SKU, or HSN..." class="table-search">
      <select id="stockFilter" aria-label="Filter stock level">
        <option value="ALL">All Products</option>
        <option value="LOW">Low Stock Alerts</option>
        <option value="OUT">Out of Stock</option>
      </select>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>ITEM NAME</th>
          <th>SKU</th>
          <th>HSN/SAC</th>
          <th>TYPE</th>
          <th>SELLING PRICE</th>
          <th>COST PRICE</th>
          <th>CURRENT STOCK</th>
          <th>TAX %</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody id="inventoryTableBody">
        <tr><td colspan="9" class="text-center">Loading inventory products...</td></tr>
      </tbody>
    </table>
  </div>
</section>
