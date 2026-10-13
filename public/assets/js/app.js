// RMSTORVIX IGNITE — Master Client Application Engine
// Keyboard Shortcuts (Tally ERP 9) · Reactive Forms · Modals · Dynamic Charts & Analytics

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sidebar Toggle & Mobile Drawer Overlay
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }
    });
  }

  // 2. Theme Toggle (Light / Dark)
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('rmstorvix_theme') || 'light';
  if (savedTheme === 'dark') document.body.classList.add('dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('rmstorvix_theme', isDark ? 'dark' : 'light');
    });
  }

  // 3. Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out?')) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
    });
  }

  // 4. Modal Engine
  const modalOverlay = document.getElementById('modalOverlay');
  const modalCard = document.getElementById('modalCard');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const openShortcutsBtn = document.getElementById('openShortcutsBtn');

  function openModal(title, html, isLarge = false) {
    if (!modalOverlay) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    if (isLarge) modalCard.classList.add('modal-lg');
    else modalCard.classList.remove('modal-lg');
    modalOverlay.style.display = 'flex';
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (shortcutsModal) shortcutsModal.style.display = 'none';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  if (openShortcutsBtn) {
    openShortcutsBtn.addEventListener('click', () => {
      if (shortcutsModal) shortcutsModal.style.display = 'flex';
    });
  }

  // 5. Global Keyboard Shortcuts (Tally ERP 9)
  document.addEventListener('keydown', (e) => {
    // Ctrl + K: Focus Global Search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const s = document.getElementById('globalSearch');
      if (s) s.focus();
      return;
    }

    // Esc: Close active modal
    if (e.key === 'Escape') {
      closeModal();
      if (sidebar) sidebar.classList.remove('open');
      return;
    }

    // Alt + P: Print
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.print();
      return;
    }

    // If an input is actively being typed into, only allow functional hotkeys with modifier or F-keys
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    if (e.key === 'F1') {
      e.preventDefault();
      if (shortcutsModal) shortcutsModal.style.display = 'flex';
    } else if (e.key === 'F2') {
      e.preventDefault();
      const d = document.getElementById('dayBookDate');
      if (d) d.focus();
    } else if (e.key === 'F5') {
      e.preventDefault();
      showNewPaymentModal('PAYMENT');
    } else if (e.key === 'F6') {
      e.preventDefault();
      showNewPaymentModal('RECEIPT');
    } else if (e.key === 'F7') {
      e.preventDefault();
      showNewJournalModal();
    } else if (e.key === 'F8') {
      e.preventDefault();
      showNewInvoiceModal();
    } else if (e.key === 'F9') {
      e.preventDefault();
      showNewPurchaseBillModal();
    }
  });

  // Header Quick Action Button
  const quickActionHeaderBtn = document.getElementById('quickActionHeaderBtn');
  if (quickActionHeaderBtn) {
    quickActionHeaderBtn.addEventListener('click', () => showNewInvoiceModal());
  }

  // 6. DASHBOARD MODULE
  if (document.getElementById('kpiSales')) {
    loadDashboard();
    const refBtn = document.getElementById('refreshDashboardBtn');
    if (refBtn) refBtn.addEventListener('click', loadDashboard);

    const openInvBtn = document.getElementById('openNewInvoiceModalBtn');
    if (openInvBtn) openInvBtn.addEventListener('click', () => showNewInvoiceModal());

    const qaNewInvoice = document.getElementById('qaNewInvoice');
    if (qaNewInvoice) qaNewInvoice.addEventListener('click', () => showNewInvoiceModal());

    const qaNewReceipt = document.getElementById('qaNewReceipt');
    if (qaNewReceipt) qaNewReceipt.addEventListener('click', () => showNewPaymentModal('RECEIPT'));

    const qaAddCustomer = document.getElementById('qaAddCustomer');
    if (qaAddCustomer) qaAddCustomer.addEventListener('click', () => showAddPartyModal('CUSTOMER'));

    const qaAddProduct = document.getElementById('qaAddProduct');
    if (qaAddProduct) qaAddProduct.addEventListener('click', () => showAddProductModal());
  }

  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (!res.ok) return;

      document.getElementById('kpiSales').textContent = `₹ ${Number(data.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiReceivables').textContent = `₹ ${Number(data.totalReceivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiOverdueCount').textContent = `${data.overdueCount || 0} unpaid`;
      document.getElementById('kpiStockItems').textContent = data.totalStockItems || 0;
      document.getElementById('kpiLowStock').textContent = `${data.lowStockItems || 0} low stock`;
      document.getElementById('kpiCashBank').textContent = `₹ ${Number(data.cashBankBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('chartTotalSales').innerHTML = `₹ ${Number(data.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} <small>total sales</small>`;

      // Render Bar Chart
      const container = document.getElementById('chartBarsContainer');
      if (container && data.monthlyBars) {
        container.innerHTML = '';
        const maxVal = Math.max(...data.monthlyBars.map(b => b.total || 0), 10000);
        data.monthlyBars.forEach(b => {
          const pct = Math.max(Math.round((b.total / maxVal) * 100), 8);
          const col = document.createElement('div');
          col.className = 'chart-bar-col';
          col.innerHTML = `
            <span class="chart-bar-fill" style="height:${pct}%;" title="₹ ${b.total}"></span>
            <small>${b.ym}</small>
          `;
          container.appendChild(col);
        });
      }

      // Render Recent Invoices
      const tbody = document.getElementById('recentInvoicesTbody');
      if (tbody) {
        if (!data.recentInvoices || data.recentInvoices.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center">No invoices created yet. Press F8 to create one!</td></tr>';
        } else {
          tbody.innerHTML = data.recentInvoices.map(inv => `
            <tr>
              <td><strong>${inv.invoice_number}</strong></td>
              <td>${inv.customer_name}</td>
              <td>${inv.invoice_date}</td>
              <td class="font-bold">₹ ${Number(inv.grand_total).toFixed(2)}</td>
              <td><span class="pill ${inv.payment_status === 'PAID' ? 'paid' : (inv.payment_status === 'PARTIALLY_PAID' ? 'pending' : 'overdue')}">${inv.payment_status}</span></td>
              <td>
                <a href="/invoice-print/${inv.id}" target="_blank" class="button button-secondary" style="padding:4px 8px;font-size:10px;">🖨 Print</a>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  // 7. INVOICE MODAL (F8)
  window.showNewInvoiceModal = async function() {
    let customers = [];
    let products = [];
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/parties?type=CUSTOMER'),
        fetch('/api/products')
      ]);
      customers = (await cRes.json()).parties || [];
      products = (await pRes.json()).products || [];
    } catch (e) {
      console.error(e);
    }

    const html = `
      <form id="createInvoiceForm">
        <div class="form-grid">
          <label>Customer *
            <select name="customer_id" id="invCustomerSelect" required>
              <option value="">-- Select Customer --</option>
              ${customers.map(c => `<option value="${c.id}" data-state="${c.state || ''}">${c.name} ${c.gstin ? '· GST: ' + c.gstin : ''}</option>`).join('')}
            </select>
          </label>
          <label>Invoice Date *
            <input type="date" name="invoice_date" value="${new Date().toISOString().slice(0, 10)}" required>
          </label>
          <label>Billing Mode
            <select name="billing_mode" id="invBillingMode">
              <option value="TRACKED" selected>Inventory Mode (Deducts Stock)</option>
              <option value="QUICK">Quick Billing Mode (Untracked)</option>
            </select>
          </label>
          <label>Supply Destination
            <select name="is_interstate" id="invInterstate">
              <option value="0" selected>Intra-State (CGST + SGST)</option>
              <option value="1">Inter-State (IGST)</option>
            </select>
          </label>
        </div>

        <div style="margin:20px 0 10px; display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px;">Line Items</strong>
          <button type="button" class="button button-secondary" id="addItemRowBtn" style="padding:5px 10px; font-size:11px;">＋ Add Item</button>
        </div>

        <div class="table-wrap">
          <table id="invoiceItemsTable">
            <thead>
              <tr>
                <th style="width:28%">PRODUCT / DESCRIPTION</th>
                <th style="width:12%">HSN/SAC</th>
                <th style="width:10%">QTY</th>
                <th style="width:15%">RATE (₹)</th>
                <th style="width:10%">DISC %</th>
                <th style="width:10%">TAX %</th>
                <th style="width:15%" class="text-right">TOTAL (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="invoiceItemsTbody"></tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:15px;">
          <div style="width:280px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Subtotal:</span> <strong id="invSubtotal">₹ 0.00</strong></div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>GST (CGST/SGST/IGST):</span> <strong id="invTax">₹ 0.00</strong></div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Round Off:</span> <strong id="invRoundOff">₹ 0.00</strong></div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:2px solid var(--line); font-size:14px; color:var(--blue);"><span>Grand Total:</span> <strong id="invGrandTotal">₹ 0.00</strong></div>
          </div>
        </div>

        <div class="form-grid" style="margin-top:15px; border-top:1px solid var(--line); padding-top:15px;">
          <label>Initial Payment (₹)
            <input type="number" step="0.01" name="initial_payment" id="invInitialPayment" value="0.00" min="0">
          </label>
          <label>Payment Method
            <select name="payment_mode">
              <option value="CASH">Cash in Hand</option>
              <option value="BANK">Bank Current Account</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Debit / Credit Card</option>
            </select>
          </label>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary">Generate & Issue Invoice</button>
        </div>
      </form>
    `;

    openModal('Create Sales Invoice (F8)', html, true);

    const tbody = document.getElementById('invoiceItemsTbody');
    const addRowBtn = document.getElementById('addItemRowBtn');

    function addRow() {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="item-desc" placeholder="Item description" list="prodList" required style="width:100%;">
          <datalist id="prodList">
            ${products.map(p => `<option value="${p.name}" data-id="${p.id}" data-rate="${p.selling_price}" data-tax="${p.tax_rate}" data-hsn="${p.hsn_sac || ''}">`).join('')}
          </datalist>
        </td>
        <td><input type="text" class="item-hsn" placeholder="HSN" style="width:100%;"></td>
        <td><input type="number" class="item-qty" value="1" min="1" step="0.01" style="width:100%;"></td>
        <td><input type="number" class="item-rate" value="0" min="0" step="0.01" style="width:100%;"></td>
        <td><input type="number" class="item-disc" value="0" min="0" max="100" style="width:100%;"></td>
        <td>
          <select class="item-tax" style="width:100%;">
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18" selected>18%</option>
            <option value="28">28%</option>
          </select>
        </td>
        <td class="text-right font-bold item-total" style="padding-top:14px;">₹ 0.00</td>
        <td><button type="button" class="btn-del-row" style="border:none;background:transparent;cursor:pointer;color:#e11d48;">✕</button></td>
      `;

      const descInput = tr.querySelector('.item-desc');
      descInput.addEventListener('change', () => {
        const val = descInput.value;
        const matched = products.find(p => p.name === val);
        if (matched) {
          tr.dataset.productId = matched.id;
          tr.querySelector('.item-rate').value = matched.selling_price;
          tr.querySelector('.item-tax').value = matched.tax_rate;
          tr.querySelector('.item-hsn').value = matched.hsn_sac || '';
        }
        recalc();
      });

      tr.querySelectorAll('input, select').forEach(inp => inp.addEventListener('input', recalc));
      tr.querySelector('.btn-del-row').addEventListener('click', () => {
        tr.remove();
        recalc();
      });

      tbody.appendChild(tr);
      recalc();
    }

    addRowBtn.addEventListener('click', addRow);
    addRow(); // Initial row

    function recalc() {
      let subtotal = 0;
      let totalTax = 0;
      const isInterstate = document.getElementById('invInterstate').value === '1';

      tbody.querySelectorAll('tr').forEach(tr => {
        const qty = Number(tr.querySelector('.item-qty').value) || 0;
        const rate = Number(tr.querySelector('.item-rate').value) || 0;
        const disc = Number(tr.querySelector('.item-disc').value) || 0;
        const taxRate = Number(tr.querySelector('.item-tax').value) || 0;

        const gross = qty * rate;
        const discAmt = gross * (disc / 100);
        const taxable = gross - discAmt;
        const taxAmt = taxable * (taxRate / 100);
        const total = taxable + taxAmt;

        subtotal += taxable;
        totalTax += taxAmt;

        tr.querySelector('.item-total').textContent = `₹ ${total.toFixed(2)}`;
      });

      const grandUnrounded = subtotal + totalTax;
      const grandRounded = Math.round(grandUnrounded);
      const roundOff = grandRounded - grandUnrounded;

      document.getElementById('invSubtotal').textContent = `₹ ${subtotal.toFixed(2)}`;
      document.getElementById('invTax').textContent = `₹ ${totalTax.toFixed(2)}`;
      document.getElementById('invRoundOff').textContent = `₹ ${roundOff.toFixed(2)}`;
      document.getElementById('invGrandTotal').textContent = `₹ ${grandRounded.toFixed(2)}`;
    }

    document.getElementById('invInterstate').addEventListener('change', recalc);

    const form = document.getElementById('createInvoiceForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const items = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        items.push({
          product_id: tr.dataset.productId ? Number(tr.dataset.productId) : null,
          description: tr.querySelector('.item-desc').value,
          hsn_sac: tr.querySelector('.item-hsn').value,
          quantity: Number(tr.querySelector('.item-qty').value),
          rate: Number(tr.querySelector('.item-rate').value),
          discount_percent: Number(tr.querySelector('.item-disc').value),
          tax_rate: Number(tr.querySelector('.item-tax').value)
        });
      });

      const payload = {
        customer_id: Number(form.customer_id.value),
        invoice_date: form.invoice_date.value,
        billing_mode: form.billing_mode.value,
        is_interstate: form.is_interstate.value === '1',
        initial_payment: Number(form.initial_payment.value) || 0,
        payment_mode: form.payment_mode.value,
        items
      };

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invoice generation failed');

        closeModal();
        alert(`Invoice ${data.invoice.invoiceNumber} successfully issued for ₹ ${data.invoice.grandTotal}!`);
        if (window.location.pathname === '/billing') loadInvoices();
        else if (window.location.pathname === '/' || window.location.pathname === '/dashboard') loadDashboard();
        window.open(`/invoice-print/${data.invoice.id}`, '_blank');
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Generate & Issue Invoice';
      }
    });
  };

  // 8. BILLING LIST PAGE
  if (document.getElementById('invoicesTableBody')) {
    loadInvoices();
    const search = document.getElementById('invoiceSearch');
    const filter = document.getElementById('invoiceStatusFilter');
    if (search) search.addEventListener('input', loadInvoices);
    if (filter) filter.addEventListener('change', loadInvoices);
    const newBtn = document.getElementById('openNewInvoiceBtn');
    if (newBtn) newBtn.addEventListener('click', () => showNewInvoiceModal());
  }

  async function loadInvoices() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    const filter = document.getElementById('invoiceStatusFilter')?.value || 'ALL';
    const query = (document.getElementById('invoiceSearch')?.value || '').toLowerCase();

    try {
      const res = await fetch(`/api/invoices?status=${filter}`);
      const data = await res.json();
      let invoices = data.invoices || [];

      if (query) {
        invoices = invoices.filter(i =>
          i.invoice_number.toLowerCase().includes(query) ||
          i.customer_name.toLowerCase().includes(query)
        );
      }

      if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No invoices found matching criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = invoices.map(i => `
        <tr>
          <td><strong>${i.invoice_number}</strong></td>
          <td>${i.customer_name}</td>
          <td>${i.invoice_date}</td>
          <td>₹ ${Number(i.subtotal).toFixed(2)}</td>
          <td>₹ ${Number(i.total_tax).toFixed(2)}</td>
          <td class="font-bold">₹ ${Number(i.grand_total).toFixed(2)}</td>
          <td class="font-bold ${i.balance_amount > 0 ? 'text-danger' : ''}">₹ ${Number(i.balance_amount).toFixed(2)}</td>
          <td><span class="pill ${i.payment_status === 'PAID' ? 'paid' : (i.payment_status === 'PARTIALLY_PAID' ? 'pending' : 'overdue')}">${i.payment_status}</span></td>
          <td>
            <a href="/invoice-print/${i.id}" target="_blank" class="button button-secondary" style="padding:4px 8px;font-size:10px;">🖨 Print</a>
            ${i.balance_amount > 0 ? `<button class="button button-primary" style="padding:4px 8px;font-size:10px;" onclick="showNewPaymentModal('RECEIPT', ${i.customer_id}, ${i.id}, ${i.balance_amount})">Collect</button>` : ''}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // 9. INVENTORY LIST PAGE
  if (document.getElementById('productsTableBody')) {
    loadProducts();
    const addBtn = document.getElementById('openAddProductBtn');
    if (addBtn) addBtn.addEventListener('click', showAddProductModal);
  }

  async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      const prods = data.products || [];
      if (prods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No inventory items. Click "Add Product" to add.</td></tr>';
        return;
      }

      tbody.innerHTML = prods.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td><code>${p.sku || '-'}</code></td>
          <td>${p.hsn_sac || '-'}</td>
          <td><span class="pill ${p.product_type === 'GOODS' ? 'paid' : 'pending'}">${p.product_type}</span></td>
          <td>₹ ${Number(p.purchase_price).toFixed(2)}</td>
          <td class="font-bold">₹ ${Number(p.selling_price).toFixed(2)}</td>
          <td>${p.tax_rate}%</td>
          <td>
            ${p.is_stock_tracked ? `
              <strong class="${p.current_stock <= p.min_stock_alert ? 'trend warning' : ''}">${p.current_stock} ${p.unit_code || 'PCS'}</strong>
              ${p.current_stock <= p.min_stock_alert ? '<small style="color:#d97706;"> (Low)</small>' : ''}
            ` : '<span class="pill not-started">Service / Untracked</span>'}
          </td>
          <td>•••</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  function showAddProductModal() {
    const html = `
      <form id="addProductForm">
        <div class="form-grid">
          <label class="col-span-2">Product / Service Name *
            <input type="text" name="name" required placeholder="e.g. Wireless Barcode Scanner">
          </label>
          <label>SKU / Item Code
            <input type="text" name="sku" placeholder="Auto-generated if empty">
          </label>
          <label>HSN / SAC Code
            <input type="text" name="hsn_sac" placeholder="e.g. 847190">
          </label>
          <label>Type
            <select name="product_type">
              <option value="GOODS" selected>Goods (Physical Product)</option>
              <option value="SERVICE">Service (Untracked)</option>
            </select>
          </label>
          <label>Tax Rate (GST)
            <select name="tax_rate">
              <option value="0">0% (Exempt)</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18" selected>18% (Standard)</option>
              <option value="28">28%</option>
            </select>
          </label>
          <label>Purchase Price (₹)
            <input type="number" step="0.01" name="purchase_price" value="0.00">
          </label>
          <label>Selling Price (₹) *
            <input type="number" step="0.01" name="selling_price" value="0.00" required>
          </label>
          <label>Track Inventory?
            <select name="is_stock_tracked">
              <option value="1" selected>Yes - Deduct Stock on Sale</option>
              <option value="0">No - Untracked Service/Item</option>
            </select>
          </label>
          <label>Opening Stock
            <input type="number" step="0.01" name="opening_stock" value="0">
          </label>
        </div>
        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary">Save Product</button>
        </div>
      </form>
    `;
    openModal('Add Product or Service', html);

    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        name: form.name.value,
        sku: form.sku.value,
        hsn_sac: form.hsn_sac.value,
        product_type: form.product_type.value,
        tax_rate: Number(form.tax_rate.value),
        purchase_price: Number(form.purchase_price.value),
        selling_price: Number(form.selling_price.value),
        is_stock_tracked: form.is_stock_tracked.value === '1',
        opening_stock: Number(form.opening_stock.value)
      };

      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save product');
        closeModal();
        alert('Product added successfully!');
        loadProducts();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // 10. PARTIES (CUSTOMERS & SUPPLIERS) PAGE
  if (document.getElementById('partiesTableBody')) {
    loadParties();
    const addBtn = document.getElementById('openAddPartyBtn');
    if (addBtn) addBtn.addEventListener('click', () => showAddPartyModal('CUSTOMER'));
  }

  async function loadParties() {
    const tbody = document.getElementById('partiesTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/parties');
      const data = await res.json();
      const parties = data.parties || [];
      if (parties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No parties found. Click "Add Party" to create.</td></tr>';
        return;
      }

      tbody.innerHTML = parties.map(p => `
        <tr>
          <td><strong>${p.name}</strong><br><small>${p.company_name || ''}</small></td>
          <td><span class="pill ${p.party_type === 'CUSTOMER' ? 'paid' : 'pending'}">${p.party_type}</span></td>
          <td><code>${p.gstin || 'Unregistered'}</code></td>
          <td>${p.mobile || ''}<br><small>${p.email || ''}</small></td>
          <td>${p.city || ''}, ${p.state || ''}</td>
          <td class="font-bold">₹ ${Number(p.current_balance).toFixed(2)}</td>
          <td>•••</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  function showAddPartyModal(defaultType = 'CUSTOMER') {
    const html = `
      <form id="addPartyForm">
        <div class="form-grid">
          <label>Contact Person Name *
            <input type="text" name="name" required placeholder="Amit Sharma">
          </label>
          <label>Company / Firm Name
            <input type="text" name="company_name" placeholder="Sharma Electronics Pvt Ltd">
          </label>
          <label>Party Type
            <select name="party_type">
              <option value="CUSTOMER" ${defaultType === 'CUSTOMER' ? 'selected' : ''}>Customer (Debtor)</option>
              <option value="SUPPLIER" ${defaultType === 'SUPPLIER' ? 'selected' : ''}>Supplier (Creditor)</option>
            </select>
          </label>
          <label>GSTIN (15 characters)
            <input type="text" name="gstin" placeholder="27AABCS1234P1Z2" maxlength="15">
          </label>
          <label>Mobile Number
            <input type="tel" name="mobile" placeholder="9811122233">
          </label>
          <label>Email Address
            <input type="email" name="email" placeholder="contact@sharmaelec.com">
          </label>
          <label class="col-span-2">Address
            <input type="text" name="address" placeholder="12 Lamington Road">
          </label>
          <label>City
            <input type="text" name="city" placeholder="Mumbai">
          </label>
          <label>State
            <input type="text" name="state" placeholder="Maharashtra">
          </label>
        </div>
        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary">Save Party</button>
        </div>
      </form>
    `;
    openModal('Add Customer or Supplier', html);

    document.getElementById('addPartyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        name: form.name.value,
        company_name: form.company_name.value,
        party_type: form.party_type.value,
        gstin: form.gstin.value,
        mobile: form.mobile.value,
        email: form.email.value,
        address: form.address.value,
        city: form.city.value,
        state: form.state.value
      };

      try {
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save party');
        closeModal();
        alert('Party added successfully!');
        loadParties();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // 10B. PURCHASES (PURCHASE BILLS) PAGE
  if (document.getElementById('purchasesTableBody')) {
    loadPurchases();
    const search = document.getElementById('purchaseSearch');
    const filter = document.getElementById('purchaseStatusFilter');
    if (search) search.addEventListener('input', loadPurchases);
    if (filter) filter.addEventListener('change', loadPurchases);
    const newBtn = document.getElementById('openNewPurchaseBtn');
    if (newBtn) newBtn.addEventListener('click', () => showNewPurchaseBillModal());
  }

  async function loadPurchases() {
    const tbody = document.getElementById('purchasesTableBody');
    if (!tbody) return;
    const filter = document.getElementById('purchaseStatusFilter')?.value || 'ALL';
    const query = (document.getElementById('purchaseSearch')?.value || '').toLowerCase();

    try {
      const res = await fetch(`/api/purchases?status=${filter}`);
      const data = await res.json();
      let bills = data.purchases || [];

      if (query) {
        bills = bills.filter(b =>
          b.bill_number.toLowerCase().includes(query) ||
          b.supplier_name.toLowerCase().includes(query)
        );
      }

      if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No purchase bills recorded yet. Press F9 to record one.</td></tr>';
        return;
      }

      tbody.innerHTML = bills.map(b => `
        <tr>
          <td><strong>${b.bill_number}</strong></td>
          <td>${b.supplier_name}</td>
          <td>${b.bill_date}</td>
          <td>${b.supplier_bill_no || '-'}</td>
          <td>₹ ${Number(b.subtotal).toFixed(2)}</td>
          <td>₹ ${Number(b.total_tax).toFixed(2)}</td>
          <td class="font-bold">₹ ${Number(b.grand_total).toFixed(2)}</td>
          <td class="font-bold ${b.balance_amount > 0 ? 'text-danger' : ''}">₹ ${Number(b.balance_amount).toFixed(2)}</td>
          <td><span class="pill ${b.payment_status === 'PAID' ? 'paid' : (b.payment_status === 'PARTIALLY_PAID' ? 'pending' : 'overdue')}">${b.payment_status}</span></td>
          <td>
            ${b.balance_amount > 0 ? `<button class="button button-primary" style="padding:4px 8px;font-size:10px;" onclick="showNewPaymentModal('PAYMENT', ${b.supplier_id}, null, ${b.balance_amount})">Pay (F5)</button>` : '•••'}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  window.showNewPurchaseBillModal = async function() {
    let suppliers = [];
    let products = [];
    try {
      const [sRes, pRes] = await Promise.all([
        fetch('/api/parties?type=SUPPLIER'),
        fetch('/api/products')
      ]);
      suppliers = (await sRes.json()).parties || [];
      products = (await pRes.json()).products || [];
    } catch (e) {
      console.error(e);
    }

    const html = `
      <form id="createPurchaseForm">
        <div class="form-grid">
          <label>Supplier *
            <select name="supplier_id" id="purSupplierSelect" required>
              <option value="">-- Select Supplier --</option>
              ${suppliers.map(s => `<option value="${s.id}">${s.name} ${s.company_name ? '· ' + s.company_name : ''}</option>`).join('')}
            </select>
          </label>
          <label>Bill Date *
            <input type="date" name="bill_date" value="${new Date().toISOString().slice(0, 10)}" required>
          </label>
          <label>Vendor Bill / Ref #
            <input type="text" name="supplier_bill_no" placeholder="e.g. VEN-9842">
          </label>
          <label>Supply Destination
            <select name="is_interstate" id="purInterstate">
              <option value="0" selected>Intra-State (CGST + SGST)</option>
              <option value="1">Inter-State (IGST)</option>
            </select>
          </label>
        </div>

        <div style="margin:20px 0 10px; display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px;">Purchase Line Items</strong>
          <button type="button" class="button button-secondary" id="addPurRowBtn" style="padding:5px 10px; font-size:11px;">＋ Add Item</button>
        </div>

        <div class="table-wrap">
          <table id="purchaseItemsTable">
            <thead>
              <tr>
                <th style="width:35%">PRODUCT / DESCRIPTION</th>
                <th style="width:12%">HSN/SAC</th>
                <th style="width:10%">QTY</th>
                <th style="width:15%">UNIT COST (₹)</th>
                <th style="width:12%">TAX %</th>
                <th style="width:16%" class="text-right">TOTAL (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="purchaseItemsTbody"></tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:15px;">
          <div style="width:280px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Subtotal:</span> <strong id="purSubtotal">₹ 0.00</strong></div>
            <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>GST (Input Credit):</span> <strong id="purTax">₹ 0.00</strong></div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:2px solid var(--line); font-size:14px; color:var(--blue);"><span>Grand Total:</span> <strong id="purGrandTotal">₹ 0.00</strong></div>
          </div>
        </div>

        <div class="form-grid" style="margin-top:15px; border-top:1px solid var(--line); padding-top:15px;">
          <label>Initial Payment (₹)
            <input type="number" step="0.01" name="initial_payment" id="purInitialPayment" value="0.00" min="0">
          </label>
          <label>Payment Method
            <select name="payment_mode">
              <option value="BANK" selected>Bank Current Account</option>
              <option value="CASH">Cash in Hand</option>
              <option value="UPI">UPI</option>
            </select>
          </label>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary">Save & Record Purchase Bill</button>
        </div>
      </form>
    `;

    openModal('Record Purchase Bill (F9)', html, true);

    const tbody = document.getElementById('purchaseItemsTbody');
    const addRowBtn = document.getElementById('addPurRowBtn');

    function addRow() {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="item-desc" placeholder="Item description" list="purProdList" required style="width:100%;">
          <datalist id="purProdList">
            ${products.map(p => `<option value="${p.name}" data-id="${p.id}" data-cost="${p.purchase_price}" data-tax="${p.tax_rate}" data-hsn="${p.hsn_sac || ''}">`).join('')}
          </datalist>
        </td>
        <td><input type="text" class="item-hsn" placeholder="HSN" style="width:100%;"></td>
        <td><input type="number" class="item-qty" value="1" min="1" step="0.01" style="width:100%;"></td>
        <td><input type="number" class="item-rate" value="0" min="0" step="0.01" style="width:100%;"></td>
        <td>
          <select class="item-tax" style="width:100%;">
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18" selected>18%</option>
            <option value="28">28%</option>
          </select>
        </td>
        <td class="text-right font-bold item-total" style="padding-top:14px;">₹ 0.00</td>
        <td><button type="button" class="btn-del-row" style="border:none;background:transparent;cursor:pointer;color:#e11d48;">✕</button></td>
      `;

      const descInput = tr.querySelector('.item-desc');
      descInput.addEventListener('change', () => {
        const val = descInput.value;
        const matched = products.find(p => p.name === val);
        if (matched) {
          tr.dataset.productId = matched.id;
          tr.querySelector('.item-rate').value = matched.purchase_price;
          tr.querySelector('.item-tax').value = matched.tax_rate;
          tr.querySelector('.item-hsn').value = matched.hsn_sac || '';
        }
        recalc();
      });

      tr.querySelectorAll('input, select').forEach(inp => inp.addEventListener('input', recalc));
      tr.querySelector('.btn-del-row').addEventListener('click', () => { tr.remove(); recalc(); });
      tbody.appendChild(tr);
      recalc();
    }

    addRowBtn.addEventListener('click', addRow);
    addRow();

    function recalc() {
      let subtotal = 0;
      let totalTax = 0;

      tbody.querySelectorAll('tr').forEach(tr => {
        const qty = Number(tr.querySelector('.item-qty').value) || 0;
        const rate = Number(tr.querySelector('.item-rate').value) || 0;
        const taxRate = Number(tr.querySelector('.item-tax').value) || 0;

        const taxable = qty * rate;
        const taxAmt = taxable * (taxRate / 100);
        const total = taxable + taxAmt;

        subtotal += taxable;
        totalTax += taxAmt;

        tr.querySelector('.item-total').textContent = `₹ ${total.toFixed(2)}`;
      });

      const grand = Math.round(subtotal + totalTax);
      document.getElementById('purSubtotal').textContent = `₹ ${subtotal.toFixed(2)}`;
      document.getElementById('purTax').textContent = `₹ ${totalTax.toFixed(2)}`;
      document.getElementById('purGrandTotal').textContent = `₹ ${grand.toFixed(2)}`;
    }

    const form = document.getElementById('createPurchaseForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const items = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        items.push({
          product_id: tr.dataset.productId ? Number(tr.dataset.productId) : null,
          description: tr.querySelector('.item-desc').value,
          hsn_sac: tr.querySelector('.item-hsn').value,
          quantity: Number(tr.querySelector('.item-qty').value),
          rate: Number(tr.querySelector('.item-rate').value),
          tax_rate: Number(tr.querySelector('.item-tax').value)
        });
      });

      const payload = {
        supplier_id: Number(form.supplier_id.value),
        bill_date: form.bill_date.value,
        supplier_bill_no: form.supplier_bill_no.value,
        is_interstate: form.is_interstate.value === '1',
        initial_payment: Number(form.initial_payment.value) || 0,
        payment_mode: form.payment_mode.value,
        items
      };

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record purchase bill');

        closeModal();
        alert(`Purchase Bill ${data.bill.billNumber} successfully recorded for ₹ ${data.bill.grandTotal}!`);
        if (window.location.pathname === '/purchases') loadPurchases();
        else if (window.location.pathname === '/inventory') loadProducts();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Save & Record Purchase Bill';
      }
    });
  };

  // 11. PAYMENTS & VOUCHERS MODAL (F5/F6)
  window.showNewPaymentModal = async function(type = 'RECEIPT', partyId = null, invoiceId = null, defaultAmt = 0) {
    let parties = [];
    try {
      const pType = type === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER';
      const res = await fetch(`/api/parties?type=${pType}`);
      parties = (await res.json()).parties || [];
    } catch (e) {
      console.error(e);
    }

    const title = type === 'RECEIPT' ? 'Record Payment Receipt (F6)' : 'Record Payment Voucher (F5)';
    const html = `
      <form id="recordPaymentForm">
        <input type="hidden" name="payment_type" value="${type}">
        <input type="hidden" name="invoice_id" value="${invoiceId || ''}">
        <div class="form-grid">
          <label>Party *
            <select name="party_id" required>
              <option value="">-- Select Party --</option>
              ${parties.map(p => `<option value="${p.id}" ${partyId === p.id ? 'selected' : ''}>${p.name} (Balance: ₹ ${p.current_balance})</option>`).join('')}
            </select>
          </label>
          <label>Date *
            <input type="date" name="payment_date" value="${new Date().toISOString().slice(0, 10)}" required>
          </label>
          <label>Amount (₹) *
            <input type="number" step="0.01" name="amount" value="${defaultAmt > 0 ? defaultAmt : ''}" required min="0.01">
          </label>
          <label>Payment Method
            <select name="payment_mode">
              <option value="CASH">Cash in Hand</option>
              <option value="BANK">Bank Current Account</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </label>
          <label class="col-span-2">Notes / Reference #
            <input type="text" name="notes" placeholder="Transaction ref or narration">
          </label>
        </div>
        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary">Save Voucher</button>
        </div>
      </form>
    `;
    openModal(title, html);

    document.getElementById('recordPaymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        payment_type: form.payment_type.value,
        party_id: Number(form.party_id.value),
        invoice_id: form.invoice_id.value ? Number(form.invoice_id.value) : null,
        amount: Number(form.amount.value),
        payment_date: form.payment_date.value,
        payment_mode: form.payment_mode.value,
        notes: form.notes.value
      };

      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record payment');
        closeModal();
        alert('Payment voucher saved and posted to General Ledger!');
        if (window.location.pathname === '/payments') loadPayments();
        if (window.location.pathname === '/billing') loadInvoices();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  // 12. PAYMENTS LIST PAGE
  if (document.getElementById('paymentsTableBody')) {
    loadPayments();
    const btn = document.getElementById('openNewReceiptBtn');
    if (btn) btn.addEventListener('click', () => showNewPaymentModal('RECEIPT'));
  }

  async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      const pays = data.payments || [];
      if (pays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No payment vouchers recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = pays.map(p => `
        <tr>
          <td><strong>${p.voucher_number}</strong></td>
          <td><span class="pill ${p.payment_type === 'RECEIPT' ? 'paid' : 'pending'}">${p.payment_type}</span></td>
          <td>${p.party_name}</td>
          <td>${p.payment_date}</td>
          <td>${p.payment_mode}</td>
          <td class="font-bold">₹ ${Number(p.amount).toFixed(2)}</td>
          <td>${p.invoice_number || '-'}</td>
          <td>${p.notes || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // 13. ACCOUNTING TABS (Trial Balance, P&L, Balance Sheet, Day Book, COA)
  if (document.getElementById('trialBalanceTbody')) {
    loadAccountingTabs();
    const jBtn = document.getElementById('openNewJournalBtn');
    if (jBtn) jBtn.addEventListener('click', showNewJournalModal);
  }

  function loadAccountingTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.style.display = 'block';
      });
    });

    loadTrialBalance();
    loadPnL();
    loadBalanceSheet();
    loadDayBook();
    loadCOA();

    const dbDate = document.getElementById('dayBookDate');
    if (dbDate) dbDate.addEventListener('change', () => loadDayBook(dbDate.value));
  }

  async function loadTrialBalance() {
    try {
      const res = await fetch('/api/accounting/trial-balance');
      const data = await res.json();
      const tbody = document.getElementById('trialBalanceTbody');
      if (!tbody) return;

      tbody.innerHTML = (data.accounts || []).map(a => `
        <tr>
          <td><code>${a.account_code}</code></td>
          <td><strong>${a.account_name}</strong></td>
          <td><span class="pill not-started">${a.account_type}</span></td>
          <td class="text-right">${a.net_debit > 0 ? '₹ ' + Number(a.net_debit).toFixed(2) : '-'}</td>
          <td class="text-right">${a.net_credit > 0 ? '₹ ' + Number(a.net_credit).toFixed(2) : '-'}</td>
        </tr>
      `).join('');

      document.getElementById('tbGrandDebit').textContent = `₹ ${Number(data.total_debit).toFixed(2)}`;
      document.getElementById('tbGrandCredit').textContent = `₹ ${Number(data.total_credit).toFixed(2)}`;
      const badge = document.getElementById('tbStatusBadge');
      if (badge) {
        badge.textContent = data.is_balanced ? 'Balanced (Debits == Credits)' : 'Unbalanced';
        badge.className = `pill ${data.is_balanced ? 'paid' : 'overdue'}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadPnL() {
    try {
      const res = await fetch('/api/accounting/pnl');
      const data = await res.json();
      const revList = document.getElementById('pnlRevenueList');
      const expList = document.getElementById('pnlExpenseList');
      if (!revList || !expList) return;

      revList.innerHTML = (data.revenues || []).map(r => `
        <div class="pnl-item"><span>${r.name} (${r.code})</span><strong>₹ ${Number(r.amount).toFixed(2)}</strong></div>
      `).join('') || '<div class="muted-note">No revenue posted.</div>';

      expList.innerHTML = (data.expenses || []).map(e => `
        <div class="pnl-item"><span>${e.name} (${e.code})</span><strong>₹ ${Number(e.amount).toFixed(2)}</strong></div>
      `).join('') || '<div class="muted-note">No expenses posted.</div>';

      document.getElementById('pnlTotalRev').textContent = `₹ ${Number(data.total_revenue).toFixed(2)}`;
      document.getElementById('pnlTotalExp').textContent = `₹ ${Number(data.total_expense).toFixed(2)}`;
      document.getElementById('pnlNetProfit').textContent = `Net Profit: ₹ ${Number(data.net_profit).toFixed(2)}`;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadBalanceSheet() {
    try {
      const res = await fetch('/api/accounting/balance-sheet');
      const data = await res.json();
      const assetList = document.getElementById('bsAssetList');
      const liabList = document.getElementById('bsLiabList');
      if (!assetList || !liabList) return;

      assetList.innerHTML = (data.assets || []).map(a => `
        <div class="pnl-item"><span>${a.name} (${a.code})</span><strong>₹ ${Number(a.amount).toFixed(2)}</strong></div>
      `).join('');

      const combined = [...(data.liabilities || []), ...(data.equities || [])];
      liabList.innerHTML = combined.map(l => `
        <div class="pnl-item"><span>${l.name} (${l.code})</span><strong>₹ ${Number(l.amount).toFixed(2)}</strong></div>
      `).join('');

      document.getElementById('bsTotalAssets').textContent = `₹ ${Number(data.total_assets).toFixed(2)}`;
      document.getElementById('bsTotalLiabEq').textContent = `₹ ${Number(data.total_liabilities_and_equity).toFixed(2)}`;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDayBook(date = null) {
    const tbody = document.getElementById('dayBookTbody');
    if (!tbody) return;
    try {
      const url = date ? `/api/accounting/day-book?date=${date}` : '/api/accounting/day-book';
      const res = await fetch(url);
      const data = await res.json();
      const entries = data.entries || [];
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions recorded for this date.</td></tr>';
        return;
      }

      tbody.innerHTML = entries.map(e => `
        <tr>
          <td><strong>${e.entry_number}</strong></td>
          <td>${e.entry_date}</td>
          <td><span class="pill in-progress">${e.reference_type || 'JOURNAL'}</span></td>
          <td>${e.narration}</td>
          <td class="font-bold">₹ ${Number(e.total_amount).toFixed(2)}</td>
          <td>${e.created_by_name || 'System'}</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCOA() {
    const tbody = document.getElementById('coaTbody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/accounting/accounts');
      const data = await res.json();
      tbody.innerHTML = (data.accounts || []).map(a => `
        <tr>
          <td><code>${a.account_code}</code></td>
          <td><strong>${a.account_name}</strong></td>
          <td><span class="pill ${a.account_type === 'ASSET' ? 'blue' : (a.account_type === 'REVENUE' ? 'green' : 'orange')}">${a.account_type}</span></td>
          <td class="font-bold">₹ ${Number(a.current_balance).toFixed(2)}</td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // 14. NEW JOURNAL ENTRY MODAL (F7)
  window.showNewJournalModal = async function() {
    let accounts = [];
    try {
      const res = await fetch('/api/accounting/accounts');
      accounts = (await res.json()).accounts || [];
    } catch (e) {
      console.error(e);
    }

    const html = `
      <form id="newJournalForm">
        <div class="form-grid">
          <label>Entry Date *
            <input type="date" name="entry_date" value="${new Date().toISOString().slice(0, 10)}" required>
          </label>
          <label>Narration / Description *
            <input type="text" name="narration" required placeholder="Adjustment of office supplies">
          </label>
        </div>

        <div style="margin:16px 0 8px; display:flex; justify-content:space-between; align-items:center;">
          <strong>Journal Debit & Credit Postings</strong>
          <button type="button" class="button button-secondary" id="addJournalRowBtn" style="padding:4px 8px;font-size:10px;">＋ Add Row</button>
        </div>

        <table id="journalLinesTable">
          <thead>
            <tr>
              <th style="width:50%">ACCOUNT</th>
              <th style="width:25%">DEBIT (₹)</th>
              <th style="width:25%">CREDIT (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="journalLinesTbody"></tbody>
          <tfoot>
            <tr class="font-bold">
              <td>Total</td>
              <td id="jTotDebit">₹ 0.00</td>
              <td id="jTotCredit">₹ 0.00</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div id="journalBalanceStatus" style="margin-top:10px;font-size:11px;font-weight:700;"></div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="button button-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
          <button type="submit" class="button button-primary" id="saveJournalBtn" disabled>Post Journal Entry</button>
        </div>
      </form>
    `;
    openModal('New Journal Entry (F7)', html);

    const tbody = document.getElementById('journalLinesTbody');
    const addBtn = document.getElementById('addJournalRowBtn');

    function addRow(defDebit = 0, defCredit = 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <select class="j-account" required style="width:100%;">
            <option value="">-- Select Account --</option>
            ${accounts.map(a => `<option value="${a.account_code}">${a.account_code} - ${a.account_name} (${a.account_type})</option>`).join('')}
          </select>
        </td>
        <td><input type="number" step="0.01" min="0" class="j-debit" value="${defDebit}" style="width:100%;"></td>
        <td><input type="number" step="0.01" min="0" class="j-credit" value="${defCredit}" style="width:100%;"></td>
        <td><button type="button" class="btn-del-row" style="border:none;background:transparent;cursor:pointer;color:#e11d48;">✕</button></td>
      `;

      tr.querySelectorAll('input, select').forEach(inp => inp.addEventListener('input', recalcJournal));
      tr.querySelector('.btn-del-row').addEventListener('click', () => { tr.remove(); recalcJournal(); });
      tbody.appendChild(tr);
      recalcJournal();
    }

    addBtn.addEventListener('click', () => addRow(0, 0));
    addRow(0, 0);
    addRow(0, 0);

    function recalcJournal() {
      let dSum = 0;
      let cSum = 0;
      tbody.querySelectorAll('tr').forEach(tr => {
        dSum += Number(tr.querySelector('.j-debit').value) || 0;
        cSum += Number(tr.querySelector('.j-credit').value) || 0;
      });

      document.getElementById('jTotDebit').textContent = `₹ ${dSum.toFixed(2)}`;
      document.getElementById('jTotCredit').textContent = `₹ ${cSum.toFixed(2)}`;

      const statusEl = document.getElementById('journalBalanceStatus');
      const saveBtn = document.getElementById('saveJournalBtn');
      const isBalanced = dSum > 0 && Math.abs(dSum - cSum) < 0.01;

      if (isBalanced) {
        statusEl.textContent = '✓ Balanced: Debits strictly equal Credits';
        statusEl.style.color = '#10b981';
        saveBtn.disabled = false;
      } else {
        statusEl.textContent = `✗ Unbalanced: Difference is ₹ ${Math.abs(dSum - cSum).toFixed(2)}`;
        statusEl.style.color = '#ef4444';
        saveBtn.disabled = true;
      }
    }

    document.getElementById('newJournalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const lines = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        const code = tr.querySelector('.j-account').value;
        const d = Number(tr.querySelector('.j-debit').value) || 0;
        const c = Number(tr.querySelector('.j-credit').value) || 0;
        if (code && (d > 0 || c > 0)) {
          lines.push({ accountCode: code, debit: d, credit: c });
        }
      });

      try {
        const res = await fetch('/api/accounting/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_date: form.entry_date.value,
            narration: form.narration.value,
            lines
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to post journal entry');
        closeModal();
        alert(`Journal entry ${data.entryNumber} posted successfully!`);
        loadAccountingTabs();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  // 15. REPORTS MODULE (GSTR-1, Valuation)
  if (document.getElementById('gstr1Tbody')) {
    loadReports();
  }

  async function loadReports() {
    try {
      const res = await fetch('/api/reports/gstr1');
      const data = await res.json();
      const tbody = document.getElementById('gstr1Tbody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td><strong>4A, 4B, 4C, 6B, 6C - B2B Invoices</strong></td>
            <td>${data.b2b.count}</td>
            <td>₹ ${Number(data.b2b.taxable).toFixed(2)}</td>
            <td>₹ ${Number(data.b2b.cgst).toFixed(2)}</td>
            <td>₹ ${Number(data.b2b.sgst).toFixed(2)}</td>
            <td>₹ ${Number(data.b2b.igst).toFixed(2)}</td>
            <td class="font-bold">₹ ${Number(data.b2b.tax).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>7 - B2C (Others) Supplies</strong></td>
            <td>${data.b2c.count}</td>
            <td>₹ ${Number(data.b2c.taxable).toFixed(2)}</td>
            <td>₹ ${Number(data.b2c.cgst).toFixed(2)}</td>
            <td>₹ ${Number(data.b2c.sgst).toFixed(2)}</td>
            <td>₹ ${Number(data.b2c.igst).toFixed(2)}</td>
            <td class="font-bold">₹ ${Number(data.b2c.tax).toFixed(2)}</td>
          </tr>
        `;
      }

      const vRes = await fetch('/api/reports/stock-valuation');
      const vData = await vRes.json();
      const vTbody = document.getElementById('valuationTbody');
      if (vTbody) {
        vTbody.innerHTML = (vData.items || []).map(i => `
          <tr>
            <td><strong>${i.name}</strong></td>
            <td><code>${i.sku || '-'}</code></td>
            <td>${i.current_stock}</td>
            <td>₹ ${Number(i.purchase_price).toFixed(2)}</td>
            <td>₹ ${Number(i.selling_price).toFixed(2)}</td>
            <td class="font-bold">₹ ${Number(i.valuation).toFixed(2)}</td>
          </tr>
        `).join('');
        document.getElementById('totalValuationText').textContent = `Total Valuation: ₹ ${Number(vData.totalValuation).toFixed(2)}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 16. BUILD CONTROL CENTER
  if (document.getElementById('ctrlPhaseList')) {
    loadBuildControlStatus();
    const testBtn = document.getElementById('runAutomatedTestsBtn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Running 12-Workflow Tests...';
        try {
          const res = await fetch('/api/build-control/run-tests', { method: 'POST' });
          const data = await res.json();
          alert(`Test Suite Execution Complete!\n${data.results.passed} Passed, ${data.results.failed} Failed in ${data.results.durationMs}ms.`);
          loadBuildControlStatus();
        } catch (e) {
          alert('Test runner error: ' + e.message);
        } finally {
          testBtn.disabled = false;
          testBtn.textContent = '▶ Run Automated Tests';
        }
      });
    }
  }

  async function loadBuildControlStatus() {
    try {
      const res = await fetch('/api/build-control/status');
      const data = await res.json();

      document.getElementById('ctrlProgressPercent').textContent = `${data.progressPercent}%`;
      document.getElementById('ctrlProgressBar').style.width = `${data.progressPercent}%`;
      document.getElementById('ctrlPhasesCount').textContent = `${data.phases.length} / 6`;

      const passedTests = (data.testRuns || []).filter(t => t.result === 'PASSED').length;
      document.getElementById('ctrlTestCount').textContent = `${passedTests} Passed`;

      const phaseList = document.getElementById('ctrlPhaseList');
      if (phaseList) {
        phaseList.innerHTML = (data.phases || []).map(p => {
          const phaseTasks = (data.tasks || []).filter(t => t.phase_id === p.id);
          const done = phaseTasks.filter(t => t.status === 'COMPLETED').length;
          const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;

          return `
            <article class="phase-card">
              <div class="phase-number">0${p.id}</div>
              <div class="phase-body">
                <div class="phase-title-row">
                  <h2>${p.phase_name}</h2>
                  <span class="pill ${p.status === 'COMPLETED' ? 'paid' : (p.status === 'IN PROGRESS' ? 'in-progress' : 'not-started')}">${p.status}</span>
                </div>
                <p>${p.description}</p>
                <div class="phase-meta">
                  <span>Tasks: ${done} / ${phaseTasks.length} Completed</span>
                  <span>Verified in SQLite WAL Database</span>
                </div>
              </div>
              <div class="phase-progress">
                <strong>${pct}%</strong>
                <div class="progress"><span style="width:${pct}%"></span></div>
              </div>
            </article>
          `;
        }).join('');
      }

      const tbody = document.getElementById('ctrlTestRunsTbody');
      if (tbody) {
        tbody.innerHTML = (data.testRuns || []).map(t => `
          <tr>
            <td><strong>${t.test_name}</strong></td>
            <td><span class="pill not-started">${t.test_type}</span></td>
            <td><span class="pill ${t.result === 'PASSED' ? 'paid' : 'overdue'}">${t.result}</span></td>
            <td>${t.details || '-'}</td>
            <td>${t.executed_at}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 17. PLATFORM ADMIN PORTAL
  if (document.getElementById('adminBizTable')) {
    loadAdminPortal();
    const filter = document.getElementById('adminStatusFilter');
    if (filter) filter.addEventListener('change', () => loadAdminPortal(filter.value));
  }

  async function loadAdminPortal(status = 'ALL') {
    try {
      const [oRes, bRes, aRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch(`/api/admin/businesses?status=${status}`),
        fetch('/api/admin/audit-logs')
      ]);

      const over = await oRes.json();
      document.getElementById('kpiTotalBiz').textContent = over.totalBiz;
      document.getElementById('kpiPendingBiz').textContent = over.pendingBiz;
      document.getElementById('kpiActiveBiz').textContent = over.approvedBiz;
      document.getElementById('kpiSuspendedBiz').textContent = over.suspendedBiz;

      const bizData = await bRes.json();
      const tbody = document.getElementById('adminBizTbody');
      if (tbody) {
        tbody.innerHTML = (bizData.businesses || []).map(b => `
          <tr>
            <td><strong>${b.business_name}</strong></td>
            <td>${b.owner_name}</td>
            <td><code>${b.gstin || 'None'}</code></td>
            <td>${b.email}<br><small>${b.mobile}</small></td>
            <td>${b.created_at}</td>
            <td><span class="pill ${b.approval_status === 'APPROVED' ? 'paid' : (b.approval_status === 'PENDING' ? 'pending' : 'overdue')}">${b.approval_status}</span></td>
            <td>
              ${b.approval_status === 'PENDING' ? `
                <button class="button button-primary" style="padding:4px 8px;font-size:10px;" onclick="adminApproveBiz(${b.id})">Approve</button>
                <button class="button button-secondary" style="padding:4px 8px;font-size:10px;" onclick="adminRejectBiz(${b.id})">Reject</button>
              ` : (b.approval_status === 'APPROVED' ? `
                <button class="button button-secondary" style="padding:4px 8px;font-size:10px;" onclick="adminSuspendBiz(${b.id})">Suspend</button>
              ` : `
                <button class="button button-primary" style="padding:4px 8px;font-size:10px;" onclick="adminReactivateBiz(${b.id})">Reactivate</button>
              `)}
            </td>
          </tr>
        `).join('');
      }

      const auditData = await aRes.json();
      const aTbody = document.getElementById('adminAuditTbody');
      if (aTbody) {
        aTbody.innerHTML = (auditData.logs || []).map(l => `
          <tr>
            <td>${l.created_at}</td>
            <td>${l.actor_name || 'System'}</td>
            <td><code>${l.action_key}</code></td>
            <td>${l.business_name || l.entity_type || '-'}</td>
            <td>${l.ip_address}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  window.adminApproveBiz = async function(id) {
    if (confirm('Approve this business for full operational access?')) {
      const res = await fetch(`/api/admin/businesses/${id}/approve`, { method: 'POST' });
      if (res.ok) { alert('Business Approved!'); loadAdminPortal(); }
    }
  };

  window.adminRejectBiz = async function(id) {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      const res = await fetch(`/api/admin/businesses/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) { alert('Business Rejected.'); loadAdminPortal(); }
    }
  };

  window.adminSuspendBiz = async function(id) {
    if (confirm('Suspend access for this business?')) {
      const res = await fetch(`/api/admin/businesses/${id}/suspend`, { method: 'POST' });
      if (res.ok) { alert('Business Suspended.'); loadAdminPortal(); }
    }
  };

  window.adminReactivateBiz = async function(id) {
    if (confirm('Reactivate this business?')) {
      const res = await fetch(`/api/admin/businesses/${id}/reactivate`, { method: 'POST' });
      if (res.ok) { alert('Business Reactivated.'); loadAdminPortal(); }
    }
  };

  // 18. SETTINGS & BACKUP
  const settingsLogoFile = document.getElementById('settingsLogoFileInput');
  if (settingsLogoFile) {
    settingsLogoFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo must be smaller than 2MB');
        settingsLogoFile.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result;
        const hidden = document.getElementById('settingsLogoHiddenInput');
        if (hidden) hidden.value = base64;
        const preview = document.getElementById('settingsFormLogoPreview');
        if (preview) { preview.src = base64; preview.style.display = 'block'; }
        const placeholder = document.getElementById('settingsFormLogoPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        business_name: settingsForm.business_name.value,
        owner_name: settingsForm.owner_name.value,
        gstin: settingsForm.gstin.value,
        invoice_prefix: settingsForm.invoice_prefix.value,
        address_line: settingsForm.address_line.value,
        city: settingsForm.city.value,
        state: settingsForm.state.value,
        pin_code: settingsForm.pin_code.value,
        logo_url: settingsForm.elements['logo_url'] ? settingsForm.elements['logo_url'].value : undefined
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Settings updated successfully!');
        location.reload();
      } else {
        alert(data.error || 'Update failed');
      }
    });
  }

  // 18.2 DIGITAL SIGNATURE & OFFICIAL STAMP ENGINE
  const sigCanvas = document.getElementById('sigPadCanvas');
  const sigDataInput = document.getElementById('digitalSignatureDataInput');
  const sealDataInput = document.getElementById('companySealDataInput');
  const digitalSigForm = document.getElementById('digitalSignatureForm');
  const sigStatusBadge = document.getElementById('sigStatusBadge');
  const previewLiveSig = document.getElementById('previewLiveSig');
  const previewLiveSeal = document.getElementById('previewLiveSeal');
  const previewLiveName = document.getElementById('previewLiveName');
  const previewLiveDesig = document.getElementById('previewLiveDesig');
  const previewLiveBadge = document.getElementById('previewLiveBadge');

  if (sigCanvas) {
    const ctx = sigCanvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    // Initialize line styles
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    // If pre-existing signature data exists, draw it onto the canvas
    if (sigDataInput && sigDataInput.value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = sigDataInput.value;
    }

    function getPos(e) {
      const rect = sigCanvas.getBoundingClientRect();
      const scaleX = sigCanvas.width / rect.width;
      const scaleY = sigCanvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function startDraw(e) {
      e.preventDefault();
      isDrawing = true;
      hasDrawn = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function stopDraw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      const dataUrl = sigCanvas.toDataURL('image/png');
      if (sigDataInput) sigDataInput.value = dataUrl;
      if (previewLiveSig) {
        previewLiveSig.src = dataUrl;
        previewLiveSig.style.display = 'block';
      }
      const note = document.getElementById('sigStatusNote');
      if (note) note.textContent = '✓ Drawn signature ready';
    }

    sigCanvas.addEventListener('mousedown', startDraw);
    sigCanvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    sigCanvas.addEventListener('touchstart', startDraw, { passive: false });
    sigCanvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    // Clear Canvas Button
    const clearSigBtn = document.getElementById('clearSigBtn');
    if (clearSigBtn) {
      clearSigBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        hasDrawn = false;
        if (sigDataInput) sigDataInput.value = '';
        if (previewLiveSig) {
          previewLiveSig.src = '';
          previewLiveSig.style.display = 'none';
        }
        const note = document.getElementById('sigStatusNote');
        if (note) note.textContent = 'Cleared';
      });
    }

    // Upload Signature File
    const sigUploadInput = document.getElementById('sigUploadInput');
    if (sigUploadInput) {
      sigUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
            const hRatio = sigCanvas.width / img.width;
            const vRatio = sigCanvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio, 1);
            const centerShiftX = (sigCanvas.width - img.width * ratio) / 2;
            const centerShiftY = (sigCanvas.height - img.height * ratio) / 2;
            ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
            const dataUrl = sigCanvas.toDataURL('image/png');
            if (sigDataInput) sigDataInput.value = dataUrl;
            if (previewLiveSig) {
              previewLiveSig.src = dataUrl;
              previewLiveSig.style.display = 'block';
            }
            const note = document.getElementById('sigStatusNote');
            if (note) note.textContent = '✓ Image uploaded & ready';
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Upload Company Seal/Stamp
    const sealUploadInput = document.getElementById('sealUploadInput');
    const sealPreviewWrap = document.getElementById('sealPreviewWrap');
    if (sealUploadInput) {
      sealUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          if (sealDataInput) sealDataInput.value = dataUrl;
          if (sealPreviewWrap) sealPreviewWrap.innerHTML = `<img src="${dataUrl}" id="sealImgPreview" alt="Seal">`;
          if (previewLiveSeal) {
            previewLiveSeal.src = dataUrl;
            previewLiveSeal.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove Seal
    const removeSealBtn = document.getElementById('removeSealBtn');
    if (removeSealBtn) {
      removeSealBtn.addEventListener('click', () => {
        if (sealDataInput) sealDataInput.value = '';
        if (sealPreviewWrap) sealPreviewWrap.innerHTML = '<span style="font-size:26px;color:#94a3b8;">⭕</span>';
        if (previewLiveSeal) {
          previewLiveSeal.src = '';
          previewLiveSeal.style.display = 'none';
        }
      });
    }

    // Live typing updates for Name & Designation
    const signatoryNameInput = document.getElementById('signatoryNameInput');
    const signatoryDesigInput = document.getElementById('signatoryDesigInput');
    const enableSigCheck = document.getElementById('enableSigCheck');
    const enableSigDateCheck = document.getElementById('enableSigDateCheck');

    if (signatoryNameInput && previewLiveName) {
      signatoryNameInput.addEventListener('input', () => {
        previewLiveName.textContent = signatoryNameInput.value.trim() || 'Authorized Signatory';
      });
    }
    if (signatoryDesigInput && previewLiveDesig) {
      signatoryDesigInput.addEventListener('input', () => {
        previewLiveDesig.textContent = signatoryDesigInput.value.trim() || 'Authorized Signatory';
      });
    }
    if (enableSigCheck) {
      enableSigCheck.addEventListener('change', () => {
        if (sigStatusBadge) {
          sigStatusBadge.className = enableSigCheck.checked ? 'pill paid' : 'pill pending';
          sigStatusBadge.textContent = enableSigCheck.checked ? '✓ Active on Invoices' : 'Disabled';
        }
      });
    }
    if (enableSigDateCheck && previewLiveBadge) {
      enableSigDateCheck.addEventListener('change', () => {
        previewLiveBadge.style.display = enableSigDateCheck.checked ? 'block' : 'none';
      });
    }

    // Submit Digital Signature Form
    if (digitalSigForm) {
      digitalSigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('saveSignatureBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳</span> Saving Signature & Stamp...';
        }

        try {
          if (hasDrawn && sigDataInput) {
            sigDataInput.value = sigCanvas.toDataURL('image/png');
          }

          const payload = {
            signatory_name: signatoryNameInput ? signatoryNameInput.value : '',
            signatory_designation: signatoryDesigInput ? signatoryDesigInput.value : '',
            enable_digital_signature: enableSigCheck ? enableSigCheck.checked : true,
            signature_date_enabled: enableSigDateCheck ? enableSigDateCheck.checked : true,
            digital_signature_data: sigDataInput ? sigDataInput.value : '',
            company_seal_data: sealDataInput ? sealDataInput.value : ''
          };

          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to save digital signature');

          alert('✓ Digital Signature and Official Stamp settings saved successfully!');
        } catch (err) {
          alert('Error: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '💾 Save Digital Signature & Stamp Settings';
          }
        }
      });
    }
  }

  const exportBackupBtn = document.getElementById('exportDataBackupBtn');
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
      window.location.href = '/api/backup/export';
    });
  }

  // 17. TOPBAR PROFILE DROPDOWN
  const profileWrap = document.getElementById('profileDropdownWrap');
  const profileBtn = document.getElementById('profileTopbarBtn');
  const profileLogout = document.getElementById('profileLogoutBtn');

  if (profileBtn && profileWrap) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = profileWrap.classList.toggle('open');
      profileBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!profileWrap.contains(e.target)) {
        profileWrap.classList.remove('open');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        profileWrap.classList.remove('open');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (profileLogout) {
    profileLogout.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to sign out?')) return;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      window.location.href = '/login';
    });
  }
});

