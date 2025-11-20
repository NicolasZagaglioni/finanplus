$(document).ready(function () {
  // Inicializar saldo si no existe
  if (!localStorage.getItem("saldo")) {
    localStorage.setItem("saldo", "100000");
  }

  // Mostrar saldo en diferentes páginas
  actualizarSaldoEnPagina();

  // LOGIN
  $("#loginForm").submit(function (e) {
    e.preventDefault();
    const email = $("#email").val().trim();
    const password = $("#password").val().trim();
    const emailCorrecto = "admin@gmail.com";
    const passwordCorrecto = "admin123";

    $("#alert-container").empty();

    if (email === emailCorrecto && password === passwordCorrecto) {
      mostrarAlerta("success", "¡Inicio de sesión exitoso! Redirigiendo...");
      setTimeout(() => {
        window.location.href = "menu.html";
      }, 1500);
    } else {
      mostrarAlerta("danger", "Credenciales incorrectas. Intenta nuevamente.");
    }
  });

  // DEPÓSITO
  window.depositar = function () {
    const monto = parseInt($("#monto").val());
    
    if (isNaN(monto) || monto <= 0) {
      mostrarAlerta("warning", "Por favor ingresa un monto válido.");
      return;
    }

    let saldo = parseInt(localStorage.getItem("saldo"));
    saldo += monto;
    localStorage.setItem("saldo", saldo.toString());

    guardarMovimiento("Depósito", monto);

    $("#monto").val("");
    mostrarAlerta("success", `¡Depósito exitoso! Has agregado $${formatearMonto(monto)} a tu cuenta.`);
    actualizarSaldoEnPagina();

    setTimeout(() => {
      window.location.href = "menu.html";
    }, 2000);
  };

  // ENVIAR DINERO
  window.mostrarFormularioContacto = function () {
    $("#formContacto").slideToggle();
  };

  window.guardarContacto = function () {
    const nombre = $("#nombreContacto").val().trim();
    const cbu = $("#cbu").val().trim();
    const alias = $("#alias").val().trim();
    const banco = $("#banco").val().trim();

    if (!nombre || !cbu || !alias || !banco) {
      mostrarAlerta("warning", "Completa todos los campos del contacto.");
      return;
    }

    const contacto = { nombre, cbu, alias, banco };
    let contactos = JSON.parse(localStorage.getItem("contactos") || "[]");
    contactos.push(contacto);
    localStorage.setItem("contactos", JSON.stringify(contactos));
    
    // Limpiar formulario
    $("#nombreContacto, #cbu, #alias, #banco").val("");
    $("#formContacto").slideUp();
    
    cargarContactos();
    mostrarAlerta("success", `Contacto ${nombre} agregado correctamente.`);
  };

  // Búsqueda de contactos
  $("#busquedaContacto").on("keyup", function() {
    const busqueda = $(this).val().toLowerCase();
    const contactos = JSON.parse(localStorage.getItem("contactos") || "[]");
    const lista = $("#listaContactos");
    
    lista.empty();
    lista.append(`<option value="">-- Selecciona un contacto --</option>`);
    
    contactos.forEach((c, i) => {
      if (c.nombre.toLowerCase().includes(busqueda) || c.alias.toLowerCase().includes(busqueda)) {
        lista.append(`<option value="${i}">${c.nombre} - ${c.alias} (${c.banco})</option>`);
      }
    });
  });

  // Mostrar información del contacto seleccionado
  $("#listaContactos").on("change", function() {
    const index = $(this).val();
    
    if (!index) {
      $("#infoContacto").slideUp();
      return;
    }

    const contactos = JSON.parse(localStorage.getItem("contactos") || "[]");
    const contacto = contactos[index];

    $("#contactoNombre").text(contacto.nombre);
    $("#contactoCbu").text(contacto.cbu);
    $("#contactoBanco").text(contacto.banco);
    $("#infoContacto").slideDown();
  });

  function cargarContactos() {
    const lista = $("#listaContactos");
    lista.empty();
    lista.append(`<option value="">-- Selecciona un contacto --</option>`);
    
    const contactos = JSON.parse(localStorage.getItem("contactos") || "[]");
    contactos.forEach((c, i) => {
      lista.append(`<option value="${i}">${c.nombre} - ${c.alias} (${c.banco})</option>`);
    });
  }

  window.enviarDinero = function () {
    const monto = parseInt($("#montoEnvio").val());
    const index = $("#listaContactos").val();
    
    // Validar que se haya seleccionado un contacto
    if (!index) {
      mostrarAlerta("warning", "⚠️ Por favor selecciona un contacto.");
      return;
    }

    // Validar que el monto sea válido
    if (isNaN(monto) || monto <= 0) {
      mostrarAlerta("warning", "⚠️ Ingresa un monto válido mayor a cero.");
      return;
    }

    const contactos = JSON.parse(localStorage.getItem("contactos") || "[]");
    const contacto = contactos[index];
    let saldo = parseInt(localStorage.getItem("saldo"));

    // VALIDACIÓN CRÍTICA: Verificar saldo suficiente
    if (monto > saldo) {
      mostrarAlerta("danger", `
        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
        <h5>Saldo insuficiente</h5>
        <p>No tienes suficiente saldo para realizar esta transferencia.</p>
        <p><strong>Saldo disponible:</strong> $${formatearMonto(saldo)}</p>
        <p><strong>Monto solicitado:</strong> $${formatearMonto(monto)}</p>
        <p><strong>Faltante:</strong> $${formatearMonto(monto - saldo)}</p>
      `);
      return;
    }

    // Si hay saldo suficiente, proceder con la transferencia
    saldo -= monto;
    localStorage.setItem("saldo", saldo.toString());

    guardarMovimiento(`Envío a ${contacto.nombre}`, -monto);
    
    // Limpiar formulario
    $("#montoEnvio").val("");
    $("#listaContactos").val("");
    $("#infoContacto").slideUp();
    
    // Actualizar saldo en pantalla
    actualizarSaldoEnPagina();
    
    mostrarAlerta("success", `
      <i class="fas fa-check-circle fa-2x mb-2 text-success"></i>
      <h5>¡Transferencia exitosa!</h5>
      <p>Has enviado <strong>$${formatearMonto(monto)}</strong> a <strong>${contacto.nombre}</strong></p>
      <p><strong>Nuevo saldo:</strong> $${formatearMonto(saldo)}</p>
      <small>Redirigiendo al menú principal...</small>
    `);

    setTimeout(() => {
      window.location.href = "menu.html";
    }, 3000);
  };

  cargarContactos();

// MOVIMIENTOS
  function getTipoTransaccion(descripcion) {
    if (descripcion.includes("Depósito")) return "depósito";
    if (descripcion.includes("Envío")) return "transferencia";
    return "otro";
  }

  function mostrarUltimosMovimientos(filtro = "todos") {
    const lista = $("#listaMovimientos");
    const movimientos = JSON.parse(localStorage.getItem("movimientos") || "[]");
    lista.empty();

    const movimientosFiltrados = movimientos.filter(mov => {
      const tipo = getTipoTransaccion(mov.descripcion);
      return filtro === "todos" || filtro === tipo;
    });

    // Actualizar contador
    $("#totalMovimientos").text(movimientosFiltrados.length);

    if (movimientosFiltrados.length === 0) {
      $("#sinMovimientos").show();
      $("#resumenMovimientos").hide();
      return;
    } else {
      $("#sinMovimientos").hide();
      $("#resumenMovimientos").show();
    }

    movimientosFiltrados.reverse().forEach((mov, index) => {
      const badge = mov.monto > 0 ? "success" : "danger";
      const icono = mov.monto > 0 ? "arrow-down" : "paper-plane";
      const signo = mov.monto > 0 ? "+" : "";
      
      lista.append(`
        <li class="list-group-item d-flex justify-content-between align-items-center animate-item" style="animation-delay: ${index * 0.05}s">
          <div>
            <i class="fas fa-${icono} mr-2"></i>
            <strong>${mov.descripcion}</strong>
            ${mov.fecha ? `<br><small class="text-muted"><i class="far fa-clock"></i> ${mov.fecha}</small>` : ''}
          </div>
          <span class="badge badge-${badge} badge-pill badge-lg">
            ${signo}$${formatearMonto(Math.abs(mov.monto))}
          </span>
        </li>
      `);
    });
  }

  // Event listener para los botones de filtro
  $('input[name="filtro"]').change(function() {
    const filtro = $(this).val();
    mostrarUltimosMovimientos(filtro);
  });

  // También mantener compatibilidad con select si lo usas
  $("#filtroTipo").change(function () {
    const filtro = $(this).val();
    mostrarUltimosMovimientos(filtro);
  });

  mostrarUltimosMovimientos();

  // FUNCIONES AUXILIARES
  window.guardarMovimiento = function (descripcion, monto) {
    const movimientos = JSON.parse(localStorage.getItem("movimientos") || "[]");
    movimientos.push({ 
      descripcion, 
      monto,
      fecha: new Date().toLocaleString()
    });
    localStorage.setItem("movimientos", JSON.stringify(movimientos));
  };

  function mostrarAlerta(tipo, mensaje) {
    const container = $("#alert-container");
    container.empty();
    container.append(`
      <div class="alert alert-${tipo} alert-dismissible fade show text-center" role="alert">
        ${mensaje}
        <button type="button" class="close" data-dismiss="alert">&times;</button>
      </div>
    `);
    
    // Scroll suave hacia la alerta
    $('html, body').animate({
      scrollTop: container.offset().top - 100
    }, 500);
  }

  function formatearMonto(monto) {
    return monto.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function actualizarSaldoEnPagina() {
    const saldo = localStorage.getItem("saldo");
    
    if ($("#saldoActual").length) {
      $("#saldoActual").text(`Saldo actual: $${formatearMonto(saldo)}`);
    }
    
    if ($("#saldoMenu").length) {
      $("#saldoMenu").html(`<strong>$${formatearMonto(saldo)}</strong>`);
    }
    
    if ($("#saldoDisponible").length) {
      $("#saldoDisponible").text(`$${formatearMonto(saldo)}`);
    }
  }
});