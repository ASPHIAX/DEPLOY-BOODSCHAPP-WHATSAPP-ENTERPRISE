// BOODSCHAPP Enterprise Template System - COMPLETE 8 TEMPLATES
class BoodschappTemplateEngine {
  constructor() {
    this.templates = {
      'welcome': {
        'nl_NL': 'Welkom bij BoodschApp! 🛒 Stuur een foto van je kassabon om direct te beginnen met besparen!'
      },
      'receipt_processing': {
        'nl_NL': '📸 Kassabon ontvangen! Een momentje geduld...'
      },
      'receipt_processed': {
        'nl_NL': '✅ Kassabon verwerkt!\n💰 Totaal: €{{total}}\n📊 Je bespaarde: €{{savings}}\n🏪 Winkel: {{store}}\n📅 Datum: {{date}}\n\nBekijk details in de app!'
      },
      'weekly_summary': {
        'nl_NL': '📊 Week overzicht:\n💰 Uitgegeven: €{{spent}}\n✨ Bespaard: €{{saved}}\n🏆 Beste deal: {{best_deal}}\n📈 Trend: {{trend}}\n\n💡 Tip: {{tip}}'
      },
      'price_alert': {
        'nl_NL': '🔥 Prijsalert!\n{{product}} nu €{{price}} bij {{store}}\nDat is €{{discount}} goedkoper! 🎉'
      },
      'tier_limit_reached': {
        'nl_NL': '⚠️ Limiet bereikt voor vandaag.\nUpgrade naar Premium voor onbeperkte scans!'
      },
      'payment_link_generated': {
        'nl_NL': '💳 **Betaallink Aangemaakt!**\n\n💰 Cashback bedrag: €{{amount}}\n🔗 Klik hier: {{paymentUrl}}\n\n✅ Betaal binnen 24 uur!'
      },
      'error': {
        'nl_NL': '❌ Sorry, er ging iets mis. Probeer het opnieuw.'
      }
    };
  }

  render(templateKey, variables = {}, locale = 'nl_NL') {
    const template = this.templates[templateKey]?.[locale] || this.templates['error'][locale];
    
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp('{{' + key + '}}', 'g');
      result = result.replace(regex, variables[key] || '');
    });
    
    return result;
  }

  formatReceiptResponse(data) {
    return this.render('receipt_processed', {
      total: (data.total || 0).toFixed(2),
      savings: (data.savings || 0).toFixed(2),
      store: data.store || 'Onbekende winkel',
      date: data.date || new Date().toLocaleDateString('nl-NL')
    });
  }

  formatWeeklySummary(data) {
    return this.render('weekly_summary', {
      spent: (data.spent || 0).toFixed(2),
      saved: (data.saved || 0).toFixed(2),
      best_deal: data.best_deal || 'Geen deals deze week',
      trend: data.trend || '0%',
      tip: data.tip || 'Blijf kassabonnen uploaden voor meer besparingen!'
    });
  }

  formatPriceAlert(data) {
    return this.render('price_alert', {
      product: data.product || 'Product',
      price: (data.price || 0).toFixed(2),
      store: data.store || 'Winkel',
      discount: (data.discount || 0).toFixed(2)
    });
  }

  formatPaymentResponse(data) {
    return this.render('payment_link_generated', {
      amount: (data.amount || 0).toFixed(2),
      paymentUrl: data.paymentUrl || '#'
    });
  }
}

const templateEngine = new BoodschappTemplateEngine();

const TEMPLATES = {
  welcome: { nl: templateEngine.render('welcome') },
  receipt_processing: { nl: templateEngine.render('receipt_processing') },
  receipt_processed: { nl: templateEngine.render('receipt_processed') },
  error: { nl: templateEngine.render('error') }
};

module.exports = { TEMPLATES, templateEngine };