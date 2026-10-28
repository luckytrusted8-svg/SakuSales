// SakuSales Web Pembeli
// Tanpa framework, ringan, menggunakan @supabase/supabase-js

(function () {
  const config = window.SAKUSALES_CONFIG || {};
  const supabaseUrl = config.SUPABASE_URL || "";
  const supabaseKey = config.SUPABASE_ANON_KEY || "";
  const sellerWa = config.SELLER_WA || "62895629244156";

  let supabase = null;
  if (window.supabase && supabaseUrl && supabaseKey) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }

  // State
  let currentSlug = "";
  let poSession = null;
  let products = [];
  let sizes = [];
  let glazes = [];
  let toppings = [];
  let cart = []; // array of items

  // DOM Elements
  const elLoading = document.getElementById("loading-state");
  const elClosed = document.getElementById("closed-state");
  const elClosedText = document.getElementById("closed-text");
  const elMain = document.getElementById("main-content");
  const elPoTitle = document.getElementById("po-title");
  const elPoMeta = document.getElementById("po-meta");
  const elProductList = document.getElementById("product-list");
  const elCartSection = document.getElementById("cart-section");
  const elCartItems = document.getElementById("cart-items");
  const elCartEmpty = document.getElementById("cart-empty");
  const elCartBar = document.getElementById("cart-bar");
  const elCartTotal = document.getElementById("cart-total");
  const elCartPreviewTotal = document.getElementById("cart-preview-total");
  const elOrderForm = document.getElementById("order-form");
  const elSubmitBtn = document.getElementById("submit-btn");
  const elErrorBox = document.getElementById("error-box");
  const elSuccessCard = document.getElementById("success-card");
  const elSummaryContent = document.getElementById("summary-content");
  const elBtnWa = document.getElementById("btn-wa");
  const elPickupCheckbox = document.getElementById("buyer-pickup");
  const elAddressGroup = document.getElementById("address-group");
  const elAddressInput = document.getElementById("buyer-address");

  // Format Rupiah
  function formatRupiah(amount) {
    const num = Math.round(Number(amount) || 0);
    return "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Ambil slug dari URL:
  // 1. Path /po/[slug]
  // 2. Query param ?slug=xyz atau ?po=xyz
  // 3. Hash #/po/xyz
  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("slug")) return params.get("slug").trim();
    if (params.get("po")) return params.get("po").trim();

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const poIndex = pathParts.indexOf("po");
    if (poIndex !== -1 && pathParts[poIndex + 1]) {
      return decodeURIComponent(pathParts[poIndex + 1]).trim();
    }

    if (window.location.hash) {
      const hashParts = window.location.hash.replace("#/", "").split("/");
      if (hashParts[0] === "po" && hashParts[1]) {
        return decodeURIComponent(hashParts[1]).trim();
      }
      if (hashParts[0]) {
        return decodeURIComponent(hashParts[0]).trim();
      }
    }

    return "";
  }

  // Tampilkan pesan error
  function showError(msg) {
    elErrorBox.textContent = msg;
    elErrorBox.style.display = "block";
    elErrorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideError() {
    elErrorBox.style.display = "none";
    elErrorBox.textContent = "";
  }

  // Tampilkan layar PO ditutup
  function showClosedScreen(message) {
    elLoading.style.display = "none";
    elMain.style.display = "none";
    elClosedText.textContent = message || "PO ini sudah ditutup.";
    elClosed.style.display = "block";
  }

  // Inisialisasi data
  async function init() {
    currentSlug = getSlugFromUrl();

    if (!supabase) {
      showError("Konfigurasi Supabase belum lengkap di file config.js.");
      elLoading.style.display = "none";
      return;
    }

    if (!currentSlug) {
      showClosedScreen("Link PO tidak menyertakan kode session. Silakan minta link resmi dari penjual.");
      return;
    }

    try {
      // 1. Ambil PO berdasarkan slug
      const { data: po, error: poErr } = await supabase
        .from("po_sessions")
        .select("*")
        .eq("slug", currentSlug)
        .maybeSingle();

      if (poErr) throw poErr;

      if (!po || !po.open) {
        showClosedScreen("PO ini sudah ditutup.");
        return;
      }

      if (po.closes_at && new Date(po.closes_at) <= new Date()) {
        showClosedScreen("PO ini sudah ditutup.");
        return;
      }

      poSession = po;

      // 2. Ambil produk, ukuran, glaze, dan topping aktif
      const [prodRes, sizeRes, glazeRes, toppingRes] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("created_at"),
        supabase.from("sizes").select("*").eq("active", true).order("price"),
        supabase.from("glazes").select("*").eq("active", true).order("name"),
        supabase.from("toppings").select("*").eq("active", true).order("name")
      ]);

      if (prodRes.error) throw prodRes.error;
      if (sizeRes.error) throw sizeRes.error;
      if (glazeRes.error) throw glazeRes.error;
      if (toppingRes.error) throw toppingRes.error;

      products = prodRes.data || [];
      sizes = sizeRes.data || [];
      glazes = glazeRes.data || [];
      toppings = toppingRes.data || [];

      renderPoHeader();
      renderCatalog();
      updatePickupState();
      renderCart();

      elLoading.style.display = "none";
      elMain.style.display = "block";
    } catch (err) {
      console.error(err);
      showError("Gagal memuat data menu: " + (err.message || err.toString()));
      elLoading.style.display = "none";
    }
  }

  // Render info PO
  function renderPoHeader() {
    elPoTitle.textContent = poSession.title;
    let metaText = "Pre Order Sedang Dibuka";
    if (poSession.closes_at) {
      const closeDate = new Date(poSession.closes_at);
      metaText += " : Tutup " + closeDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    elPoMeta.innerHTML = '<span class="badge-open"><span class="pulse-dot"></span> BUKA</span> <span>' + metaText + '</span>';
  }

  // Render katalog produk & ukuran (Ringkas Varian per Produk)
  function renderCatalog() {
    if (products.length === 0) {
      elProductList.innerHTML = '<div class="empty-state"><p>Belum ada produk yang aktif untuk PO ini.</p></div>';
      return;
    }

    elProductList.innerHTML = "";

    products.forEach(function (product) {
      const prodSizes = sizes.filter(function (s) { return s.product_id === product.id; });
      if (prodSizes.length === 0) return;

      const card = document.createElement("div");
      card.className = "product-card";
      card.id = "product-card-" + product.id;

      // State lokal untuk kartu produk ini
      let currentSize = prodSizes[0];
      let selectedGlazeIds = [];
      // Auto-select glaze pertama jika ukuran include glaze
      if (currentSize.included_glaze > 0 && glazes.length > 0) {
        selectedGlazeIds.push(glazes[0].id);
      }
      let selectedToppingIds = [];
      let itemQty = 1;

      // Header Produk
      const header = document.createElement("div");
      header.className = "product-header";
      header.innerHTML =
        '<h3 class="product-title">' + product.name + '</h3>' +
        '<span class="product-badge">' + prodSizes.length + ' Pilihan Ukuran</span>';
      card.appendChild(header);

      // Wrapper Selector Ukuran (Pill Selector)
      const sizeSelectorBlock = document.createElement("div");
      sizeSelectorBlock.className = "size-selector-block";

      const sizeLabel = document.createElement("label");
      sizeLabel.className = "customizer-label";
      sizeLabel.textContent = "Pilihan Ukuran Kemasan:";
      sizeSelectorBlock.appendChild(sizeLabel);

      const sizePillsWrap = document.createElement("div");
      sizePillsWrap.className = "size-pills-wrap";

      const sizePillButtons = [];

      prodSizes.forEach(function (size) {
        const pillBtn = document.createElement("button");
        pillBtn.type = "button";
        pillBtn.className = "size-pill" + (size.id === currentSize.id ? " active" : "");
        pillBtn.innerHTML =
          '<span>' + size.name + ' (' + size.pieces + ' pcs)</span>' +
          '<span class="pill-price">' + formatRupiah(size.price) + '</span>';

        pillBtn.addEventListener("click", function () {
          currentSize = size;
          sizePillButtons.forEach(function (btn) { btn.classList.remove("active"); });
          pillBtn.classList.add("active");

          // Auto-pilih glaze jika belum ada yang terpilih
          if (currentSize.included_glaze > 0 && selectedGlazeIds.length === 0 && glazes.length > 0) {
            selectedGlazeIds.push(glazes[0].id);
          }

          updateProductCardUI();
        });

        sizePillButtons.push(pillBtn);
        sizePillsWrap.appendChild(pillBtn);
      });

      sizeSelectorBlock.appendChild(sizePillsWrap);
      card.appendChild(sizeSelectorBlock);

      // Box Customizer (Glaze, Topping, Note)
      const customizerBox = document.createElement("div");
      customizerBox.className = "customizer-box";

      // Meta bar (Ukuran aktif & harga)
      const metaBar = document.createElement("div");
      metaBar.className = "customizer-meta-bar";
      metaBar.innerHTML =
        '<div class="meta-size-info">' +
          '<span class="meta-size-name" id="meta-name-' + product.id + '">' + currentSize.name + '</span>' +
          '<span class="meta-pieces" id="meta-pcs-' + product.id + '">' + currentSize.pieces + ' pcs</span>' +
        '</div>' +
        '<div class="meta-price" id="meta-price-' + product.id + '">' + formatRupiah(currentSize.price) + '</div>';
      customizerBox.appendChild(metaBar);

      // Pilihan Glaze / Rasa
      let glazeChipsWrap = null;
      let glazeHintEl = null;

      if (glazes.length > 0) {
        const glazeGroup = document.createElement("div");
        glazeGroup.className = "customizer-group";

        const glazeLabelRow = document.createElement("div");
        glazeLabelRow.className = "customizer-label-row";

        const glazeLbl = document.createElement("label");
        glazeLbl.className = "customizer-label";
        glazeLbl.textContent = "Pilihan Glaze / Rasa";

        glazeHintEl = document.createElement("span");
        glazeHintEl.className = "customizer-hint";
        glazeHintEl.id = "glaze-hint-" + product.id;
        glazeHintEl.textContent = "Termasuk " + currentSize.included_glaze + " rasa, ekstra " + formatRupiah(currentSize.extra_glaze_price);

        glazeLabelRow.appendChild(glazeLbl);
        glazeLabelRow.appendChild(glazeHintEl);
        glazeGroup.appendChild(glazeLabelRow);

        glazeChipsWrap = document.createElement("div");
        glazeChipsWrap.className = "chips-group";

        glazes.forEach(function (g) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip-select" + (selectedGlazeIds.includes(g.id) ? " selected" : "");
          chip.innerHTML = '<span>' + g.name + '</span>';

          chip.addEventListener("click", function () {
            const idx = selectedGlazeIds.indexOf(g.id);
            if (idx > -1) {
              selectedGlazeIds.splice(idx, 1);
            } else {
              // Jika ukuran hanya include 1 glaze dan belum ada ekstra,
              // mengklik chip lain otomatis menggantikan pilihan rasa agar tidak merepotkan pembeli
              if (currentSize.included_glaze === 1 && selectedGlazeIds.length >= 1) {
                selectedGlazeIds = [g.id];
              } else {
                selectedGlazeIds.push(g.id);
              }
            }
            updateProductCardUI();
          });

          glazeChipsWrap.appendChild(chip);
        });

        glazeGroup.appendChild(glazeChipsWrap);
        customizerBox.appendChild(glazeGroup);
      }

      // Pilihan Topping Tambahan
      let toppingChipsWrap = null;
      if (toppings.length > 0) {
        const toppingGroup = document.createElement("div");
        toppingGroup.className = "customizer-group";

        const toppingLabelRow = document.createElement("div");
        toppingLabelRow.className = "customizer-label-row";
        const topLbl = document.createElement("label");
        topLbl.className = "customizer-label";
        topLbl.textContent = "Topping Tambahan (Opsional)";
        toppingLabelRow.appendChild(topLbl);
        toppingGroup.appendChild(toppingLabelRow);

        toppingChipsWrap = document.createElement("div");
        toppingChipsWrap.className = "chips-group";

        toppings.forEach(function (t) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip-select" + (selectedToppingIds.includes(t.id) ? " selected" : "");
          chip.innerHTML = '<span>' + t.name + '</span> <span class="chip-extra">(+' + formatRupiah(t.extra_price) + ')</span>';

          chip.addEventListener("click", function () {
            const idx = selectedToppingIds.indexOf(t.id);
            if (idx > -1) {
              selectedToppingIds.splice(idx, 1);
            } else {
              selectedToppingIds.push(t.id);
            }
            updateProductCardUI();
          });

          toppingChipsWrap.appendChild(chip);
        });

        toppingGroup.appendChild(toppingChipsWrap);
        customizerBox.appendChild(toppingGroup);
      }

      // Catatan Khusus
      const noteGroup = document.createElement("div");
      noteGroup.className = "customizer-group";
      const noteInput = document.createElement("input");
      noteInput.type = "text";
      noteInput.className = "form-input";
      noteInput.placeholder = "Catatan khusus (contoh: jangan terlalu manis)";
      noteGroup.appendChild(noteInput);
      customizerBox.appendChild(noteGroup);

      card.appendChild(customizerBox);

      // Hitung harga satuan item
      function calculateUnitPrice() {
        const extraGlazesCount = Math.max(0, selectedGlazeIds.length - currentSize.included_glaze);
        const extraGlazeTotal = extraGlazesCount * currentSize.extra_glaze_price;

        let extraToppingTotal = 0;
        selectedToppingIds.forEach(function (tid) {
          const top = toppings.find(function (t) { return t.id === tid; });
          if (top) extraToppingTotal += top.extra_price;
        });

        return currentSize.price + extraGlazeTotal + extraToppingTotal;
      }

      // Baris Aksi (Stepper Qty & Tombol Tambah ke Keranjang)
      const actionRow = document.createElement("div");
      actionRow.className = "action-row";

      const qtyCtrl = document.createElement("div");
      qtyCtrl.className = "qty-control";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "qty-btn qty-minus";
      minusBtn.setAttribute("aria-label", "Kurang");
      minusBtn.textContent = "-";
      minusBtn.addEventListener("click", function () {
        if (itemQty > 1) {
          itemQty--;
          qtyVal.textContent = itemQty;
          updateProductCardUI();
        }
      });

      const qtyVal = document.createElement("span");
      qtyVal.className = "qty-val";
      qtyVal.textContent = "1";

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "qty-btn qty-plus";
      plusBtn.setAttribute("aria-label", "Tambah");
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", function () {
        itemQty++;
        qtyVal.textContent = itemQty;
        updateProductCardUI();
      });

      qtyCtrl.appendChild(minusBtn);
      qtyCtrl.appendChild(qtyVal);
      qtyCtrl.appendChild(plusBtn);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-primary";

      function updateProductCardUI() {
        const metaNameEl = document.getElementById("meta-name-" + product.id);
        const metaPcsEl = document.getElementById("meta-pcs-" + product.id);
        const metaPriceEl = document.getElementById("meta-price-" + product.id);

        if (metaNameEl) metaNameEl.textContent = currentSize.name;
        if (metaPcsEl) metaPcsEl.textContent = currentSize.pieces + " pcs";
        if (metaPriceEl) metaPriceEl.textContent = formatRupiah(currentSize.price);

        if (glazeHintEl) {
          glazeHintEl.textContent = "Termasuk " + currentSize.included_glaze + " rasa, ekstra " + formatRupiah(currentSize.extra_glaze_price);
        }

        // Sinkronisasi status selected chip glaze
        if (glazeChipsWrap) {
          const chips = glazeChipsWrap.querySelectorAll(".chip-select");
          chips.forEach(function (chip, gIdx) {
            const g = glazes[gIdx];
            if (g && selectedGlazeIds.includes(g.id)) {
              chip.classList.add("selected");
            } else {
              chip.classList.remove("selected");
            }
          });
        }

        // Sinkronisasi status selected chip topping
        if (toppingChipsWrap) {
          const chips = toppingChipsWrap.querySelectorAll(".chip-select");
          chips.forEach(function (chip, tIdx) {
            const t = toppings[tIdx];
            if (t && selectedToppingIds.includes(t.id)) {
              chip.classList.add("selected");
            } else {
              chip.classList.remove("selected");
            }
          });
        }

        const unitPrice = calculateUnitPrice();
        const subtotal = unitPrice * itemQty;
        addBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>' +
            '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
          '</svg> ' +
          '<span>Tambah ke Keranjang · ' + formatRupiah(subtotal) + '</span>';
      }

      addBtn.addEventListener("click", function () {
        const glazeNames = selectedGlazeIds.map(function (gid) {
          const g = glazes.find(function (item) { return item.id === gid; });
          return g ? g.name : "";
        }).filter(Boolean);

        const toppingNames = selectedToppingIds.map(function (tid) {
          const t = toppings.find(function (item) { return item.id === tid; });
          return t ? t.name : "";
        }).filter(Boolean);

        addToCart({
          size_id: currentSize.id,
          size_name: currentSize.name,
          product_name: product.name,
          qty: itemQty,
          glaze_ids: [...selectedGlazeIds],
          glaze_names: glazeNames,
          topping_ids: [...selectedToppingIds],
          topping_names: toppingNames,
          unit_price_preview: calculateUnitPrice(),
          note: noteInput.value.trim()
        });

        // Feedback tactile cepat
        addBtn.innerHTML = '<span>✓ Masuk Keranjang!</span>';
        setTimeout(function () {
          updateProductCardUI();
        }, 800);

        // Reset kuantitas dan catatan
        noteInput.value = "";
        itemQty = 1;
        qtyVal.textContent = "1";
      });

      actionRow.appendChild(qtyCtrl);
      actionRow.appendChild(addBtn);
      card.appendChild(actionRow);

      updateProductCardUI();
      elProductList.appendChild(card);
    });
  }

  // Tambah item ke keranjang
  function addToCart(item) {
    cart.push(item);
    renderCart();
    hideError();
  }

  // Hapus item dari keranjang
  function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
  }

  // Render Keranjang Pesanan & Update Nomor Langkah
  function renderCart() {
    const totalCount = cart.reduce(function (sum, it) { return sum + it.qty; }, 0);

    const elStepMenuNum = document.getElementById("step-menu-num");
    const elStepCartNum = document.getElementById("step-cart-num");
    const elStepCheckoutNum = document.getElementById("step-checkout-num");
    const elCartCountBadge = document.getElementById("cart-count-badge");
    const elCartBarCount = document.getElementById("cart-bar-count");

    if (cart.length === 0) {
      elCartItems.innerHTML = "";
      if (elCartEmpty) elCartEmpty.style.display = "none";
      if (elCartSection) elCartSection.style.display = "none";
      elCartBar.style.display = "none";
      elCartPreviewTotal.textContent = "Rp 0";

      // Step indicator jika keranjang kosong: Menu (1), Checkout (2)
      if (elStepMenuNum) elStepMenuNum.textContent = "1";
      if (elStepCheckoutNum) elStepCheckoutNum.textContent = "2";
      return;
    }

    if (elCartEmpty) elCartEmpty.style.display = "none";
    if (elCartSection) elCartSection.style.display = "block";
    elCartItems.innerHTML = "";

    // Step indicator jika ada keranjang: Menu (1), Keranjang (2), Checkout (3)
    if (elStepMenuNum) elStepMenuNum.textContent = "1";
    if (elStepCartNum) elStepCartNum.textContent = "2";
    if (elStepCheckoutNum) elStepCheckoutNum.textContent = "3";

    if (elCartCountBadge) elCartCountBadge.textContent = totalCount + " item";
    if (elCartBarCount) elCartBarCount.textContent = totalCount + " item";

    let totalPreview = 0;

    cart.forEach(function (item, index) {
      const itemSubtotal = item.unit_price_preview * item.qty;
      totalPreview += itemSubtotal;

      const row = document.createElement("div");
      row.className = "cart-item-row";

      let tagsHtml = "";
      if (item.glaze_names && item.glaze_names.length > 0) {
        tagsHtml += '<span class="detail-tag tag-glaze">Glaze: ' + item.glaze_names.join(", ") + '</span>';
      } else {
        tagsHtml += '<span class="detail-tag tag-note">Original (Tanpa Glaze)</span>';
      }

      if (item.topping_names && item.topping_names.length > 0) {
        tagsHtml += '<span class="detail-tag tag-topping">Topping: ' + item.topping_names.join(", ") + '</span>';
      }

      if (item.note) {
        tagsHtml += '<span class="detail-tag tag-note">Catatan: ' + item.note + '</span>';
      }

      row.innerHTML =
        '<div style="flex: 1; padding-right: 12px;">' +
          '<div style="font-size: 15px; font-weight: 700; color: var(--color-ink);">' +
            item.product_name + ' (' + item.size_name + ') <span style="color: var(--color-ink-muted);">x ' + item.qty + '</span>' +
          '</div>' +
          '<div class="cart-item-tags">' + tagsHtml + '</div>' +
          '<div style="font-weight: 800; margin-top: 6px; color: var(--color-primary); font-size: 15px;">' + formatRupiah(itemSubtotal) + '</div>' +
        '</div>' +
        '<div>' +
          '<button type="button" class="cart-item-remove" data-index="' + index + '">Hapus</button>' +
        '</div>';

      elCartItems.appendChild(row);
    });

    // Pasang listener hapus
    const removeButtons = elCartItems.querySelectorAll(".cart-item-remove");
    removeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        removeFromCart(idx);
      });
    });

    elCartTotal.textContent = formatRupiah(totalPreview);
    elCartPreviewTotal.textContent = formatRupiah(totalPreview);
    elCartBar.style.display = "block";
    elCartBar.classList.remove("bump");
    void elCartBar.offsetWidth;
    elCartBar.classList.add("bump");
  }

  // Sinkronisasi status Ambil Sendiri (Kondisional Alamat)
  function updatePickupState() {
    const isPickup = elPickupCheckbox.checked;
    const card = elPickupCheckbox.closest(".pickup-toggle-card");
    if (card) {
      if (isPickup) {
        card.classList.add("checked");
      } else {
        card.classList.remove("checked");
      }
    }
    if (isPickup) {
      elAddressGroup.style.display = "none";
      elAddressInput.required = false;
      elAddressInput.value = "";
    } else {
      elAddressGroup.style.display = "block";
      elAddressInput.required = true;
    }
  }

  elPickupCheckbox.addEventListener("change", updatePickupState);

  // Submit Formulir Pesanan
  elOrderForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError();

    if (cart.length === 0) {
      showError("Keranjang belanja masih kosong. Silakan pilih menu terlebih dahulu.");
      return;
    }

    const name = document.getElementById("buyer-name").value.trim();
    let wa = document.getElementById("buyer-wa").value.trim();
    const isPickup = elPickupCheckbox.checked;
    const address = isPickup ? "" : elAddressInput.value.trim();
    const payment = document.getElementById("buyer-payment").value;
    const note = document.getElementById("buyer-note").value.trim();

    if (!name) {
      showError("Nama pemesan wajib diisi.");
      return;
    }

    if (!wa) {
      showError("Nomor WhatsApp wajib diisi.");
      return;
    }

    // Normalisasi nomor WA
    wa = wa.replace(/[^0-9]/g, "");
    if (wa.startsWith("0")) {
      wa = "62" + wa.slice(1);
    } else if (wa.startsWith("8")) {
      wa = "62" + wa;
    }

    if (!isPickup && !address) {
      showError("Alamat pengantaran wajib diisi jika tidak ambil sendiri.");
      return;
    }

    // Siapkan p_buyer dan p_items sesuai spesifikasi RPC create_order
    const p_buyer = {
      name: name,
      wa: wa,
      address: address,
      pickup: isPickup,
      payment: payment,
      note: note
    };

    const p_items = cart.map(function (item) {
      return {
        size_id: item.size_id,
        qty: item.qty,
        glaze_ids: item.glaze_ids,
        topping_ids: item.topping_ids,
        note: item.note
      };
    });

    elSubmitBtn.disabled = true;
    elSubmitBtn.textContent = "Memproses pesanan...";

    try {
      // 5. Panggil RPC create_order di Supabase
      const { data: orderId, error: rpcErr } = await supabase.rpc("create_order", {
        p_slug: currentSlug,
        p_buyer: p_buyer,
        p_items: p_items
      });

      if (rpcErr) throw rpcErr;

      // 6. Hitung total belanja riil & kirim Push Notification ke HP penjual
      const totalBelanja = cart.reduce(function (sum, item) {
        return sum + (item.unit_price_preview * item.qty);
      }, 0);
      sendPushNotification(orderId, p_buyer, totalBelanja);

      // 7. Ambil snapshot pesanan yang baru dibuat untuk konfirmasi harga final
      showSuccessView({
        order_id: orderId,
        buyer: p_buyer,
        items: cart
      });

    } catch (err) {
      console.error(err);
      // 7. Jika submit gagal, tampilkan pesan error dari server dalam Bahasa Indonesia.
      // Keranjang belanja TIDAK BOLEH hilang.
      let errMsg = err.message || "Gagal membuat pesanan. Silakan periksa kembali.";
      if (errMsg.includes("PO tidak aktif")) {
        errMsg = "Sesi PO ini sudah tidak aktif atau sudah ditutup.";
      } else if (errMsg.includes("Keranjang kosong")) {
        errMsg = "Keranjang pesanan masih kosong.";
      } else if (errMsg.includes("Ukuran tidak tersedia")) {
        errMsg = "Salah satu ukuran produk yang dipilih sudah tidak tersedia.";
      }
      showError(errMsg);
    } finally {
      elSubmitBtn.disabled = false;
      elSubmitBtn.textContent = "Konfirmasi & Buat Pesanan";
    }
  });

  // Tampilkan Ringkasan Sukses
  function showSuccessView(orderData) {
    elMain.style.display = "none";
    elCartBar.style.display = "none";

    let totalRupiah = 0;
    let itemsCardsHtml = "";
    let waItemsText = [];

    orderData.items.forEach(function (item, idx) {
      const sub = item.unit_price_preview * item.qty;
      totalRupiah += sub;

      let tagsHtml = "";
      let detailDescParts = [];

      if (item.glaze_names && item.glaze_names.length > 0) {
        tagsHtml += '<span class="detail-tag tag-glaze">Glaze: ' + item.glaze_names.join(", ") + '</span>';
        detailDescParts.push("Glaze: " + item.glaze_names.join(", "));
      } else {
        tagsHtml += '<span class="detail-tag tag-note">Original (Tanpa Glaze)</span>';
        detailDescParts.push("Tanpa Glaze");
      }

      if (item.topping_names && item.topping_names.length > 0) {
        tagsHtml += '<span class="detail-tag tag-topping">Topping: ' + item.topping_names.join(", ") + '</span>';
        detailDescParts.push("Topping: " + item.topping_names.join(", "));
      }

      if (item.note) {
        tagsHtml += '<span class="detail-tag tag-note">Catatan: ' + item.note + '</span>';
        detailDescParts.push("Catatan: " + item.note);
      }

      itemsCardsHtml +=
        '<div class="summary-item-card">' +
          '<div class="summary-item-header">' +
            '<span class="summary-item-title">' + (idx + 1) + '. ' + item.product_name + ' (' + item.size_name + ') x' + item.qty + '</span>' +
            '<span class="summary-item-price">' + formatRupiah(sub) + '</span>' +
          '</div>' +
          '<div class="summary-tag-wrap">' + tagsHtml + '</div>' +
        '</div>';

      let waItemLine = (idx + 1) + ". " + item.product_name + " (" + item.size_name + ") x" + item.qty;
      if (detailDescParts.length > 0) {
        waItemLine += "\n   * " + detailDescParts.join("\n   * ");
      }
      waItemsText.push(waItemLine);
    });

    const paymentText = orderData.buyer.payment === "qris" ? "QRIS (Transfer / E-Wallet)" : "Cash (Tunai Saat Serah Terima)";
    const deliveryText = orderData.buyer.pickup ? "Ambil Sendiri di Lokasi Penjual" : orderData.buyer.address;

    let qrisHtml = "";
    if (orderData.buyer.payment === "qris") {
      qrisHtml =
        '<div class="qris-payment-card">' +
          '<div class="qris-card-header">' +
            '<div class="qris-icon-badge">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="3" width="7" height="7"></rect>' +
                '<rect x="14" y="3" width="7" height="7"></rect>' +
                '<rect x="14" y="14" width="7" height="7"></rect>' +
                '<rect x="3" y="14" width="7" height="7"></rect>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<h3 class="qris-title">Pembayaran QRIS / DANA</h3>' +
              '<p class="qris-subtitle">Pindai kode QRIS di bawah ini untuk transfer</p>' +
            '</div>' +
          '</div>' +
          '<div class="qris-image-wrapper">' +
            '<img src="assets/qris.png" alt="QRIS DANA SakuSales" class="qris-image" />' +
          '</div>' +
          '<div class="qris-amount-row">' +
            '<span>Total yang Harus Ditransfer:</span>' +
            '<strong class="qris-amount-val">' + formatRupiah(totalRupiah) + '</strong>' +
          '</div>' +
          '<p class="qris-note">Setelah transfer berhasil, simpan tangkapan layar bukti pembayaran lalu tekan tombol kirim ke WhatsApp di bawah ini.</p>' +
        '</div>';
    }

    elSummaryContent.innerHTML =
      '<div class="summary-buyer-info">' +
        '<div><strong>Nama Pemesan:</strong> ' + orderData.buyer.name + '</div>' +
        '<div><strong>WhatsApp:</strong> ' + orderData.buyer.wa + '</div>' +
        '<div><strong>Pengantaran:</strong> ' + deliveryText + '</div>' +
        '<div><strong>Metode Bayar:</strong> ' + paymentText + '</div>' +
        (orderData.buyer.note ? '<div><strong>Catatan Pesanan:</strong> ' + orderData.buyer.note + '</div>' : '') +
      '</div>' +
      '<div class="summary-items-list">' +
        itemsCardsHtml +
      '</div>' +
      '<div class="summary-total-bar">' +
        '<span class="summary-total-title">Total Tagihan</span>' +
        '<span class="summary-total-amount">' + formatRupiah(totalRupiah) + '</span>' +
      '</div>' +
      qrisHtml;

    // Susun pesan WhatsApp
    let waMessage =
      "Halo SakuSales, saya mau konfirmasi pesanan PO:\n\n" +
      "Nama: " + orderData.buyer.name + "\n" +
      "WhatsApp: " + orderData.buyer.wa + "\n" +
      "Pengantaran: " + (orderData.buyer.pickup ? "Ambil Sendiri di Lokasi Penjual" : orderData.buyer.address) + "\n\n" +
      "Daftar Pesanan:\n" + waItemsText.join("\n") + "\n\n" +
      "Total: " + formatRupiah(totalRupiah) + "\n" +
      "Metode Bayar: " + (orderData.buyer.payment === "qris" ? "QRIS" : "Cash (Tunai)") + "\n";

    if (orderData.buyer.note) {
      waMessage += "Catatan: " + orderData.buyer.note + "\n";
    }

    if (orderData.buyer.payment === "qris") {
      waMessage += "\nBerikut saya lampirkan bukti transfer pembayarannya. Mohon dicek. Terima kasih!";
    } else {
      waMessage += "\nPembayaran akan dilakukan secara tunai saat serah terima. Terima kasih!";
    }

    const waUrl = "https://wa.me/" + sellerWa + "?text=" + encodeURIComponent(waMessage);
    elBtnWa.href = waUrl;

    elSuccessCard.style.display = "block";
    elSuccessCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Kirim Push Notification ke OneSignal (tembus ke HP penjual saat di luar aplikasi / layar mati)
  async function sendPushNotification(orderId, buyer, totalAmount) {
    try {
      const config = window.SAKUSALES_CONFIG || {};
      const appId = config.ONESIGNAL_APP_ID || "6e7d4167-3a83-49b2-88fc-1a19a7bd77e5";
      const apiKey = config.ONESIGNAL_REST_API_KEY;

      if (!apiKey || apiKey.trim() === "") {
        console.warn("OneSignal REST API Key belum disetel di config.js. Notifikasi background luar aplikasi tidak dikirim.");
        return;
      }

      const paymentLabel = buyer.payment === "qris" ? "QRIS" : "Cash";
      const payload = {
        app_id: appId.trim(),
        included_segments: ["Subscribed Users"],
        headings: { en: "Pesanan Baru Masuk!" },
        contents: { en: buyer.name + " : " + formatRupiah(totalAmount) + " (" + paymentLabel + ")" },
        priority: 10,
        data: { order_id: orderId }
      };

      const res = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Key " + apiKey.trim()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log("OneSignal push notification result:", data);
    } catch (err) {
      console.warn("Gagal mengirim OneSignal push notification:", err);
    }
  }

  // Mulai saat halaman siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
