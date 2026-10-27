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

  // Render katalog produk & ukuran
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

      const title = document.createElement("h3");
      title.className = "product-title";
      title.textContent = product.name;
      card.appendChild(title);

      prodSizes.forEach(function (size) {
        const sizeBlock = document.createElement("div");
        sizeBlock.className = "size-item";
        sizeBlock.id = "size-block-" + size.id;

        // Customizer state untuk item ini
        let selectedGlazeIds = [];
        let selectedToppingIds = [];
        let itemQty = 1;

        // Header Ukuran
        const header = document.createElement("div");
        header.className = "size-header";
        header.innerHTML =
          '<div>' +
            '<div class="size-name">' + size.name + '</div>' +
            '<div class="size-pieces">' + size.pieces + ' pcs</div>' +
          '</div>' +
          '<div class="size-price" id="price-display-' + size.id + '">' + formatRupiah(size.price) + '</div>';
        sizeBlock.appendChild(header);

        // Customizer
        const customizer = document.createElement("div");
        customizer.className = "customizer";

        // Pilihan Glaze
        if (glazes.length > 0) {
          const glazeLabel = document.createElement("label");
          glazeLabel.className = "customizer-label";
          glazeLabel.innerHTML = 'Pilih Glaze / Rasa <span class="customizer-hint">(Termasuk ' + size.included_glaze + ', ekstra ' + formatRupiah(size.extra_glaze_price) + ')</span>';
          customizer.appendChild(glazeLabel);

          const glazeChips = document.createElement("div");
          glazeChips.className = "chips-group";

          glazes.forEach(function (g) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-select";
            chip.innerHTML = '<span>' + g.name + '</span>';

            chip.addEventListener("click", function () {
              const idx = selectedGlazeIds.indexOf(g.id);
              if (idx > -1) {
                selectedGlazeIds.splice(idx, 1);
                chip.classList.remove("selected");
              } else {
                selectedGlazeIds.push(g.id);
                chip.classList.add("selected");
              }
              updatePriceDisplay();
            });

            glazeChips.appendChild(chip);
          });
          customizer.appendChild(glazeChips);
        }

        // Pilihan Topping
        if (toppings.length > 0) {
          const toppingLabel = document.createElement("label");
          toppingLabel.className = "customizer-label";
          toppingLabel.innerHTML = 'Pilih Topping Tambahan';
          customizer.appendChild(toppingLabel);

          const toppingChips = document.createElement("div");
          toppingChips.className = "chips-group";

          toppings.forEach(function (t) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-select";
            chip.innerHTML = '<span>' + t.name + '</span> <span class="chip-extra">(+' + formatRupiah(t.extra_price) + ')</span>';

            chip.addEventListener("click", function () {
              const idx = selectedToppingIds.indexOf(t.id);
              if (idx > -1) {
                selectedToppingIds.splice(idx, 1);
                chip.classList.remove("selected");
              } else {
                selectedToppingIds.push(t.id);
                chip.classList.add("selected");
              }
              updatePriceDisplay();
            });

            toppingChips.appendChild(chip);
          });
          customizer.appendChild(toppingChips);
        }

        // Catatan item
        const noteGroup = document.createElement("div");
        noteGroup.style.marginTop = "8px";
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.className = "form-input";
        noteInput.placeholder = "Catatan khusus (contoh: jangan terlalu manis)";
        noteGroup.appendChild(noteInput);
        customizer.appendChild(noteGroup);

        // Hitung harga satuan preview
        function calculateUnitPrice() {
          const extraGlazesCount = Math.max(0, selectedGlazeIds.length - size.included_glaze);
          const extraGlazeTotal = extraGlazesCount * size.extra_glaze_price;

          let extraToppingTotal = 0;
          selectedToppingIds.forEach(function (tid) {
            const top = toppings.find(function (t) { return t.id === tid; });
            if (top) extraToppingTotal += top.extra_price;
          });

          return size.price + extraGlazeTotal + extraToppingTotal;
        }

        function updatePriceDisplay() {
          const unitPrice = calculateUnitPrice();
          const displayEl = document.getElementById("price-display-" + size.id);
          if (displayEl) {
            displayEl.textContent = formatRupiah(unitPrice * itemQty);
          }
        }

        // Baris Aksi Qty dan Tombol Tambah
        const actionRow = document.createElement("div");
        actionRow.className = "action-row";

        const qtyCtrl = document.createElement("div");
        qtyCtrl.className = "qty-control";

        const minusBtn = document.createElement("button");
        minusBtn.type = "button";
        minusBtn.className = "qty-btn qty-minus";
        minusBtn.textContent = "-";
        minusBtn.addEventListener("click", function () {
          if (itemQty > 1) {
            itemQty--;
            qtyVal.textContent = itemQty;
            updatePriceDisplay();
          }
        });

        const qtyVal = document.createElement("span");
        qtyVal.className = "qty-val";
        qtyVal.textContent = "1";

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = "qty-btn qty-plus";
        plusBtn.textContent = "+";
        plusBtn.addEventListener("click", function () {
          itemQty++;
          qtyVal.textContent = itemQty;
          updatePriceDisplay();
        });

        qtyCtrl.appendChild(minusBtn);
        qtyCtrl.appendChild(qtyVal);
        qtyCtrl.appendChild(plusBtn);

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn btn-primary";
        addBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> <span>Tambah ke Keranjang</span>';
        addBtn.addEventListener("click", function () {
          addToCart({
            size_id: size.id,
            size_name: size.name,
            product_name: product.name,
            qty: itemQty,
            glaze_ids: [...selectedGlazeIds],
            glaze_names: selectedGlazeIds.map(function (gid) {
              const g = glazes.find(function (item) { return item.id === gid; });
              return g ? g.name : "";
            }),
            topping_ids: [...selectedToppingIds],
            topping_names: selectedToppingIds.map(function (tid) {
              const t = toppings.find(function (item) { return item.id === tid; });
              return t ? t.name : "";
            }),
            unit_price_preview: calculateUnitPrice(),
            note: noteInput.value.trim()
          });

          // Reset input catatan & kuantitas
          noteInput.value = "";
          itemQty = 1;
          qtyVal.textContent = "1";
          updatePriceDisplay();
        });

        actionRow.appendChild(qtyCtrl);
        actionRow.appendChild(addBtn);

        sizeBlock.appendChild(customizer);
        sizeBlock.appendChild(actionRow);
        card.appendChild(sizeBlock);
      });

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

  // Render Keranjang
  function renderCart() {
    if (cart.length === 0) {
      elCartItems.innerHTML = "";
      elCartEmpty.style.display = "block";
      elCartBar.style.display = "none";
      elCartPreviewTotal.textContent = "Rp 0";
      return;
    }

    elCartEmpty.style.display = "none";
    elCartItems.innerHTML = "";

    let totalPreview = 0;

    cart.forEach(function (item, index) {
      const itemSubtotal = item.unit_price_preview * item.qty;
      totalPreview += itemSubtotal;

      const row = document.createElement("div");
      row.className = "cart-item-row";

      let metaParts = [];
      if (item.glaze_names.length > 0) {
        metaParts.push("Glaze: " + item.glaze_names.join(", "));
      }
      if (item.topping_names.length > 0) {
        metaParts.push("Topping: " + item.topping_names.join(", "));
      }
      if (item.note) {
        metaParts.push("Catatan: " + item.note);
      }

      row.innerHTML =
        '<div style="flex: 1; padding-right: 8px;">' +
          '<strong>' + item.product_name + ' (' + item.size_name + ')</strong> x ' + item.qty +
          '<div class="cart-item-meta">' + metaParts.join(" | ") + '</div>' +
          '<div style="font-weight: 800; margin-top: 4px; color: var(--color-primary);">' + formatRupiah(itemSubtotal) + '</div>' +
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

  // Toggle Ambil Sendiri
  elPickupCheckbox.addEventListener("change", function () {
    if (elPickupCheckbox.checked) {
      elAddressGroup.style.display = "none";
      elAddressInput.required = false;
    } else {
      elAddressGroup.style.display = "block";
      elAddressInput.required = true;
    }
  });

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

      // 6. Ambil snapshot pesanan yang baru dibuat dari server untuk konfirmasi harga final
      // Catatan: RLS anon tidak bisa select tabel orders, maka kita gunakan ringkasan dari cart
      // dan preview total dari server function.
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
    let itemsHtml = "";
    let waItemsText = [];

    orderData.items.forEach(function (item, idx) {
      const sub = item.unit_price_preview * item.qty;
      totalRupiah += sub;

      let detailParts = [];
      if (item.glaze_names.length > 0) detailParts.push("Glaze: " + item.glaze_names.join(", "));
      if (item.topping_names.length > 0) detailParts.push("Topping: " + item.topping_names.join(", "));
      if (item.note) detailParts.push("Catatan: " + item.note);

      itemsHtml +=
        '<tr>' +
          '<td>' + (idx + 1) + '. ' + item.product_name + ' (' + item.size_name + ') x' + item.qty +
          (detailParts.length > 0 ? '<div style="font-size: 11px; color: var(--color-text-muted);">' + detailParts.join(" | ") + '</div>' : '') +
          '</td>' +
          '<td>' + formatRupiah(sub) + '</td>' +
        '</tr>';

      let waItemLine = (idx + 1) + ". " + item.product_name + " (" + item.size_name + ") x" + item.qty;
      if (detailParts.length > 0) {
        waItemLine += " [" + detailParts.join(", ") + "]";
      }
      waItemsText.push(waItemLine);
    });

    const paymentText = orderData.buyer.payment === "qris" ? "QRIS" : "Cash (Tunai)";
    const deliveryText = orderData.buyer.pickup ? "Ambil Sendiri" : orderData.buyer.address;

    elSummaryContent.innerHTML =
      '<div style="margin-bottom: 12px; font-size: 13px;">' +
        '<div><strong>Nama:</strong> ' + orderData.buyer.name + '</div>' +
        '<div><strong>WhatsApp:</strong> ' + orderData.buyer.wa + '</div>' +
        '<div><strong>Pengantaran:</strong> ' + deliveryText + '</div>' +
        '<div><strong>Metode Bayar:</strong> ' + paymentText + '</div>' +
        (orderData.buyer.note ? '<div><strong>Catatan:</strong> ' + orderData.buyer.note + '</div>' : '') +
      '</div>' +
      '<table class="summary-table">' +
        '<tbody>' + itemsHtml + '</tbody>' +
        '<tfoot>' +
          '<tr style="border-top: 2px solid var(--color-border); font-size: 15px;">' +
            '<td style="padding-top: 10px;"><strong>Total Tagihan</strong></td>' +
            '<td style="padding-top: 10px; color: var(--color-primary);"><strong>' + formatRupiah(totalRupiah) + '</strong></td>' +
          '</tr>' +
        '</tfoot>' +
      '</table>';

    // Susun pesan WhatsApp sesuai spesifikasi bagian 4:
    // https://wa.me/62895629244156 dengan pesan:
    // nama pemesan, daftar pesanan, total, metode bayar.
    // Untuk QRIS, pesan meminta pembeli mengirim bukti TF.
    let waMessage =
      "Halo SakuSales, saya mau konfirmasi pesanan PO:\n\n" +
      "Nama: " + orderData.buyer.name + "\n" +
      "WhatsApp: " + orderData.buyer.wa + "\n" +
      "Pengantaran: " + (orderData.buyer.pickup ? "Ambil Sendiri" : orderData.buyer.address) + "\n\n" +
      "Daftar Pesanan:\n" + waItemsText.join("\n") + "\n\n" +
      "Total: " + formatRupiah(totalRupiah) + "\n" +
      "Metode Bayar: " + paymentText + "\n";

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

  // Mulai saat halaman siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
