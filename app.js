// Haval H6 Petrol vs HEV Payback Calculator
// Fetches current Pakistan petrol price and computes how long until the HEV premium pays for itself.

(function () {
  'use strict';

  // Fallback price if live fetch fails (April 2026 post-hike figure)
  const FALLBACK_PETROL_PRICE = 393.35;
  const FALLBACK_SOURCE_NOTE = 'Using fallback (Apr 2026). Edit in Advanced to override.';

  // DOM refs
  const els = {
    petrolPriceDisplay: document.getElementById('petrolPrice'),
    petrolSource: document.getElementById('petrolSource'),
    monthlyKm: document.getElementById('monthlyKm'),
    citySplit: document.getElementById('citySplit'),
    splitLabel: document.getElementById('splitLabel'),
    petrolPriceInput: document.getElementById('petrolPriceInput'),
    fuelInflation: document.getElementById('fuelInflation'),
    priceIce: document.getElementById('priceIce'),
    priceHev: document.getElementById('priceHev'),
    iceCity: document.getElementById('iceCity'),
    iceHwy: document.getElementById('iceHwy'),
    hevCity: document.getElementById('hevCity'),
    hevHwy: document.getElementById('hevHwy'),

    premium: document.getElementById('premium'),
    paybackYears: document.getElementById('paybackYears'),
    paybackKm: document.getElementById('paybackKm'),
    monthlySavings: document.getElementById('monthlySavings'),

    cityIce: document.getElementById('cityIce'),
    cityHev: document.getElementById('cityHev'),
    citySavings: document.getElementById('citySavings'),
    cityPayback: document.getElementById('cityPayback'),
    hwyIce: document.getElementById('hwyIce'),
    hwyHev: document.getElementById('hwyHev'),
    hwySavings: document.getElementById('hwySavings'),
    hwyPayback: document.getElementById('hwyPayback'),
    mixIce: document.getElementById('mixIce'),
    mixHev: document.getElementById('mixHev'),
    mixSavings: document.getElementById('mixSavings'),
    mixPayback: document.getElementById('mixPayback'),

    verdict: document.getElementById('verdict'),
  };

  // Formatting helpers
  const fmtPKR = (n) => 'PKR ' + Math.round(n).toLocaleString('en-PK');
  const fmtPKRShort = (n) => {
    if (n >= 1_000_000) return 'PKR ' + (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return 'PKR ' + (n / 1_000).toFixed(1) + 'K';
    return 'PKR ' + Math.round(n);
  };

  // Fetch current petrol price.
  // Primary approach: scrape the brecorder/hamariweb via a CORS proxy. Browsers block cross-origin HTML scraping,
  // so we rely on a public CORS proxy (allorigins.win) which returns the raw HTML. We then regex out the price.
  // If anything fails, fall back to a known recent figure and let the user override in Advanced.
  async function fetchPetrolPrice() {
    const sources = [
      {
        name: 'Business Recorder',
        url: 'https://www.brecorder.com/news/40418122',
        regex: /petrol now costs Rs\s*([\d.]+)/i,
      },
      {
        name: 'HamariWeb',
        url: 'https://hamariweb.com/finance/petrol-prices-in-pakistan/',
        regex: /price of petrol in Pakistan.*?Rs\.\s*([\d.]+)/i,
      },
    ];

    for (const source of sources) {
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(source.url);
        const response = await fetch(proxyUrl, { cache: 'no-store' });
        if (!response.ok) continue;
        const html = await response.text();
        const match = html.match(source.regex);
        if (match && match[1]) {
          const price = parseFloat(match[1]);
          if (price > 200 && price < 1000) {
            return { price, source: source.name, live: true };
          }
        }
      } catch (e) {
        // try next source
      }
    }

    return { price: FALLBACK_PETROL_PRICE, source: FALLBACK_SOURCE_NOTE, live: false };
  }

  function getInputs() {
    const split = parseInt(els.citySplit.value, 10);
    return {
      monthlyKm: Math.max(0, parseFloat(els.monthlyKm.value) || 0),
      cityPct: split / 100,
      hwyPct: (100 - split) / 100,
      petrolPrice: Math.max(0, parseFloat(els.petrolPriceInput.value) || 0),
      priceIce: Math.max(0, parseFloat(els.priceIce.value) || 0),
      priceHev: Math.max(0, parseFloat(els.priceHev.value) || 0),
      iceCity: Math.max(0.1, parseFloat(els.iceCity.value) || 0.1),
      iceHwy: Math.max(0.1, parseFloat(els.iceHwy.value) || 0.1),
      hevCity: Math.max(0.1, parseFloat(els.hevCity.value) || 0.1),
      hevHwy: Math.max(0.1, parseFloat(els.hevHwy.value) || 0.1),
      fuelInflation: (parseFloat(els.fuelInflation.value) || 0) / 100,
    };
  }

  // Calculate years to payback accounting for fuel price inflation.
  // If monthlySaving grows at inflation rate r per year, cumulative savings after t years (monthly compounding):
  // Sum over months of monthlySaving * (1+r)^(m/12).
  // For simplicity we compound annually; close enough for this calculator.
  // Solve for t where cumulative savings = premium.
  function yearsToPayback(premium, monthlySaving, annualInflation) {
    if (monthlySaving <= 0 || premium <= 0) return Infinity;
    if (annualInflation <= 0 || annualInflation < 0.0001) {
      return premium / (monthlySaving * 12);
    }
    // Cumulative savings after n full years = monthlySaving * 12 * ((1+r)^n - 1) / r
    // Solve for n: n = log(1 + premium * r / (monthlySaving * 12)) / log(1+r)
    const r = annualInflation;
    const annual = monthlySaving * 12;
    const years = Math.log(1 + (premium * r) / annual) / Math.log(1 + r);
    return years;
  }

  function formatYears(years) {
    if (!isFinite(years) || years > 100) return '—';
    if (years < 1) {
      const months = Math.round(years * 12);
      return months + ' month' + (months === 1 ? '' : 's');
    }
    const wholeYears = Math.floor(years);
    const months = Math.round((years - wholeYears) * 12);
    if (months === 0) return wholeYears + ' year' + (wholeYears === 1 ? '' : 's');
    if (months === 12) return (wholeYears + 1) + ' years';
    return wholeYears + 'y ' + months + 'm';
  }

  function compute() {
    const i = getInputs();

    // Monthly fuel costs for each scenario
    const iceCityCost = (i.monthlyKm / i.iceCity) * i.petrolPrice;
    const iceHwyCost = (i.monthlyKm / i.iceHwy) * i.petrolPrice;
    const iceMixCost = ((i.monthlyKm * i.cityPct) / i.iceCity + (i.monthlyKm * i.hwyPct) / i.iceHwy) * i.petrolPrice;

    const hevCityCost = (i.monthlyKm / i.hevCity) * i.petrolPrice;
    const hevHwyCost = (i.monthlyKm / i.hevHwy) * i.petrolPrice;
    const hevMixCost = ((i.monthlyKm * i.cityPct) / i.hevCity + (i.monthlyKm * i.hwyPct) / i.hevHwy) * i.petrolPrice;

    const citySavings = iceCityCost - hevCityCost;
    const hwySavings = iceHwyCost - hevHwyCost;
    const mixSavings = iceMixCost - hevMixCost;

    const premium = i.priceHev - i.priceIce;

    const cityYears = yearsToPayback(premium, citySavings, i.fuelInflation);
    const hwyYears = yearsToPayback(premium, hwySavings, i.fuelInflation);
    const mixYears = yearsToPayback(premium, mixSavings, i.fuelInflation);

    // Total km driven by payback time (using user's monthly km)
    const paybackKm = isFinite(mixYears) ? mixYears * 12 * i.monthlyKm : 0;

    // Render headline
    els.premium.textContent = fmtPKRShort(premium);
    els.paybackYears.textContent = formatYears(mixYears);
    els.paybackKm.textContent = isFinite(mixYears)
      ? '~' + Math.round(paybackKm).toLocaleString('en-PK') + ' km driven'
      : 'Never at this mileage';
    els.monthlySavings.textContent = fmtPKR(mixSavings);

    // Render table
    els.cityIce.textContent = fmtPKR(iceCityCost);
    els.cityHev.textContent = fmtPKR(hevCityCost);
    els.citySavings.textContent = fmtPKR(citySavings);
    els.cityPayback.textContent = formatYears(cityYears);

    els.hwyIce.textContent = fmtPKR(iceHwyCost);
    els.hwyHev.textContent = fmtPKR(hevHwyCost);
    els.hwySavings.textContent = fmtPKR(hwySavings);
    els.hwyPayback.textContent = formatYears(hwyYears);

    els.mixIce.textContent = fmtPKR(iceMixCost);
    els.mixHev.textContent = fmtPKR(hevMixCost);
    els.mixSavings.textContent = fmtPKR(mixSavings);
    els.mixPayback.textContent = formatYears(mixYears);

    // Split label
    const cityPctDisplay = Math.round(i.cityPct * 100);
    els.splitLabel.textContent = cityPctDisplay + '% city / ' + (100 - cityPctDisplay) + '% motorway';

    // Verdict
    renderVerdict(mixYears, i);
  }

  function renderVerdict(mixYears, i) {
    let tone, title, body;

    if (!isFinite(mixYears)) {
      tone = 'bad';
      title = 'HEV will never pay for itself at this mileage.';
      body = 'Fuel savings alone don\'t cover the PKR ' + Math.round((i.priceHev - i.priceIce) / 1_000_000 * 100) / 100 + 'M premium. The Petrol 1.5T is the better financial choice.';
    } else if (mixYears <= 4) {
      tone = 'good';
      title = 'HEV makes financial sense.';
      body = 'You\'ll recover the premium in about ' + formatYears(mixYears) + '. With typical 8–10 year vehicle ownership, you come out ahead — assuming battery health holds.';
    } else if (mixYears <= 7) {
      tone = 'neutral';
      title = 'It\'s close — but consider the risks.';
      body = 'Payback lands around ' + formatYears(mixYears) + '. That\'s within the battery\'s typical life but leaves little margin. Also factor in opportunity cost, resale, and the pace of EV/hybrid tech obsolescence.';
    } else {
      tone = 'bad';
      title = 'The Petrol variant is the smarter buy.';
      body = 'Payback would take ' + formatYears(mixYears) + ' — by then you\'re looking at a new battery (a major expense) and the HEV tech in this car will likely be obsolete. At ' + i.monthlyKm + ' km/month, the 1.5T Petrol is the clear choice.';
    }

    els.verdict.className = 'verdict ' + tone;
    els.verdict.innerHTML = '<strong>' + title + '</strong>' + body;
  }

  // Bind events
  function bindEvents() {
    const inputs = [
      els.monthlyKm, els.citySplit, els.petrolPriceInput, els.fuelInflation,
      els.priceIce, els.priceHev,
      els.iceCity, els.iceHwy, els.hevCity, els.hevHwy,
    ];
    inputs.forEach((el) => {
      el.addEventListener('input', compute);
      el.addEventListener('change', compute);
    });
  }

  // Init
  async function init() {
    bindEvents();
    // Show fallback immediately so the UI is usable even while fetching
    els.petrolPriceDisplay.textContent = 'PKR ' + FALLBACK_PETROL_PRICE.toFixed(2) + '/L';
    els.petrolPriceInput.value = FALLBACK_PETROL_PRICE;
    els.petrolSource.textContent = 'Fetching latest rate…';
    compute();

    const result = await fetchPetrolPrice();
    els.petrolPriceDisplay.textContent = 'PKR ' + result.price.toFixed(2) + '/L';
    els.petrolPriceInput.value = result.price;
    els.petrolSource.textContent = result.live
      ? 'Live from ' + result.source + ' • ' + new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
      : result.source;
    compute();
  }

  // Kick off on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
