function validatePayAnyWayForm(value, requestId, amount) {
    if (!value || typeof value !== "object")
        return;
    const form = value;
    if (form.action !== "https://www.payanyway.ru/assistant.htm" || form.method !== "POST" || !form.fields || Array.isArray(form.fields))
        return;
    const fields = form.fields;
    const allowed = ["MNT_ID", "MNT_TRANSACTION_ID", "MNT_AMOUNT", "MNT_CURRENCY_CODE", "MNT_TEST_MODE", "MNT_DESCRIPTION", "moneta.locale", "MNT_SIGNATURE", "MNT_SUCCESS_URL", "MNT_FAIL_URL", "MNT_RETURN_URL", "MNT_INPROGRESS_URL"];
    if (Object.keys(fields).some(key => !allowed.includes(key) || typeof fields[key] !== "string" || fields[key].length > 1000))
        return;
    if (fields.MNT_ID !== "47523795" || fields.MNT_TRANSACTION_ID !== requestId || fields.MNT_AMOUNT !== amount.toFixed(2) ||
        fields.MNT_CURRENCY_CODE !== "RUB" || !["0", "1"].includes(fields.MNT_TEST_MODE) || !/^[a-f0-9]{32}$/i.test(fields.MNT_SIGNATURE || ""))
        return;
    const origin = requestId.startsWith("RB-") ? "https://realbuzz.ru" : "https://xn----8sbicgasaatoponcziw4g.xn--p1ai";
    for (const name of ["MNT_SUCCESS_URL", "MNT_FAIL_URL", "MNT_RETURN_URL", "MNT_INPROGRESS_URL"]) {
        try {
            const url = new URL(fields[name]);
            if (url.origin !== origin || url.pathname !== "/payment/return/" || url.searchParams.get("order") !== requestId || url.username || url.password)
                return;
        }
        catch (_a) {
            return;
        }
    }
    return { action: form.action, method: "POST", fields: Object.assign({}, fields) };
}

window.validatePayAnyWayForm = validatePayAnyWayForm;
// Match the Apps Script payment mode for new orders: 'bank', 'prodamus', 'payanyway' or 'yookassa'.
window.ORDER_PAYMENT_MODE = 'bank';

window.renderOrderPayment = function (container, order) {
  var mode = order.provider && (order.providerLocked || order.provider === 'yookassa') ? order.provider : window.ORDER_PAYMENT_MODE;
  var testPaid = order.paymentStatus === 'Тестовая оплата';
  var canceled = order.paymentStatus === 'Отменена';
  var paidSupport = order.paymentStatus === 'Оплачено' ? '<p class="payment-support">Есть вопросы по заказу? <a href="https://t.me/Savkin_1337" target="_blank" rel="noopener noreferrer">Напишите нам в Telegram</a>.</p>' : '';
  if (['yookassa', 'prodamus', 'payanyway'].includes(mode) || order.paymentStatus === 'Оплачено') {
    container.innerHTML = '<section class="order-payment" aria-label="Оплата заявки" data-clarity-mask="true"><h3 data-heading></h3>' +
      '<dl class="order-summary"><div><dt>Номер заявки</dt><dd data-order-id></dd></div><div><dt>Пакет</dt><dd data-order-plan></dd></div><div><dt>К оплате</dt><dd class="order-amount" data-order-amount></dd></div></dl>' +
      '<p data-payment-message></p>' + paidSupport + '</section>';
    container.querySelector('[data-heading]').textContent = order.paymentStatus === 'Оплачено' ? 'Заказ оплачен' :
      testPaid ? 'Тестовый платёж прошёл' : canceled ? 'Платёж отменён' : 'Заявка сохранена — можно оплатить';
    container.querySelector('[data-order-id]').textContent = order.requestId;
    container.querySelector('[data-order-plan]').textContent = order.plan;
    container.querySelector('[data-order-amount]').textContent = order.amount.toLocaleString('ru-RU') + ' ₽';
    var message = container.querySelector('[data-payment-message]');
    if (order.paymentStatus === 'Оплачено') message.textContent = 'Оплата получена.';
    else if (testPaid) message.textContent = 'Тестовый заказ сохранён.';
    else if (mode === 'payanyway' && order.provider === 'payanyway' && validatePayAnyWayForm(order.paymentForm, order.requestId, order.amount)) {
      message.textContent = 'Оплатите выбранный пакет. Сумма уже указана на странице оплаты.';
      var form = document.createElement('form');
      form.action = order.paymentForm.action; form.method = 'post';
      Object.keys(order.paymentForm.fields).forEach(function(name) { var input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = order.paymentForm.fields[name]; form.appendChild(input); });
      var button = document.createElement('button'); button.type = 'submit'; button.className = 'payment-prodamus-button'; button.textContent = 'Оплатить'; form.appendChild(button); message.after(form);
    } else if (!canceled && (mode === 'yookassa' || mode === 'prodamus') && order.provider === mode && order.paymentUrl) {
      message.textContent = 'Оплатите выбранный пакет. Сумма уже указана на странице оплаты.';
      var link = document.createElement('a');
      link.className = 'payment-prodamus-button';
      link.href = order.paymentUrl;
      link.textContent = mode === 'yookassa' ? 'Оплатить через ЮKassa' : 'Оплатить';
      if (mode === 'yookassa') link.rel = 'noreferrer';
      message.after(link);
    } else if (mode === 'yookassa') {
      message.textContent = 'Ссылка на оплату недоступна. Напишите на realbuzzmanager@yandex.ru и укажите номер заявки.';
    } else message.textContent = 'Оплата временно недоступна. Попробуйте чуть позже или напишите на realbuzzmanager@yandex.ru.';
    return;
  }
  container.innerHTML = '<section class="order-payment" aria-label="Оплата заявки" data-clarity-mask="true">' +
    '<h3>Заявка сохранена — можно оплатить</h3>' +
    '<dl class="order-summary"><div><dt>Номер заявки</dt><dd data-order-id></dd></div><div><dt>Пакет</dt><dd data-order-plan></dd></div><div><dt>К оплате</dt><dd class="order-amount" data-order-amount></dd></div></dl>' +
    '<p><span class="payment-instruction--desktop">Выберите банк, отсканируйте QR-код и введите сумму.</span><span class="payment-instruction--mobile">Выберите банк и введите сумму.</span></p>' +
    '<div class="payment-banks"><article class="payment-bank"><h4>Сбер и Т-Банк</h4><img src="/assets/payments/sber.png" width="600" height="600" alt="QR-код оплаты через Сбер"><a href="https://www.sberbank.ru/ru/choise_bank?requisiteNumber=79174812644&amp;bankCode=100000000111" target="_blank" rel="noopener noreferrer">Оплатить</a><small class="payment-help">Не открывается? Попробуйте Яндекс Браузер.</small><small class="payment-help payment-help--desktop">QR-код можно сканировать в приложении банка.</small></article>' +
    '<article class="payment-bank"><h4>Альфа, Газпромбанк, ВТБ, МТС Банк, Совкомбанк</h4><img src="/assets/payments/alfa.png" width="600" height="600" alt="QR-код оплаты через Альфа-Банк"><a href="https://c2c.cbrpay.ru/BS1I000S80DJB659986O6F6FV53371EP" target="_blank" rel="noopener noreferrer">Оплатить</a></article></div>' +
    '</section>';
  container.querySelectorAll('[data-order-id]').forEach(function (node) { node.textContent = order.requestId; });
  container.querySelector('[data-order-plan]').textContent = order.plan;
  container.querySelector('[data-order-amount]').textContent = order.amount.toLocaleString('ru-RU') + ' ₽';

};
