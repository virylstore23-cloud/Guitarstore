(function () {
  function sameType(selected){
    if(!Array.isArray(selected) || selected.length<2) return true;
    const first = selected[0]?.category || selected[0]?.compare_type || '';
    return selected.every(k => (k?.category||k?.compare_type||'') === first);
  }

  // Wait for the app to expose functions/selection
  function ready(fn){ 
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  }

  ready(function(){
    // Guard "add to compare" if the app exposes it
    if (typeof window.addToCompare === 'function' && !window.__ADD_COMPARE_WRAPPED) {
      const orig = window.addToCompare;
      window.addToCompare = function(kit){
        const sel = (window.__COMPARE ||= []);
        if (sel.length && (sel[0].category||sel[0].compare_type)!==(kit.category||kit.compare_type)) {
          alert('Please compare items of the same type (e.g., kits vs amps).');
          return;
        }
        return orig(kit);
      };
      window.__ADD_COMPARE_WRAPPED = true;
    }

    // If the app builds rows via buildCompareRows(selected), enhance it for amps
    if (typeof window.buildCompareRows === 'function' && !window.__BUILD_ROWS_WRAPPED) {
      const origRows = window.buildCompareRows;
      window.buildCompareRows = function(selected){
        if (!sameType(selected)) return origRows(selected);

        const cat = (selected[0]?.category||'').toLowerCase();

        // DRUM AMPS: show amp-specific headings (no mesh heads)
        if (cat === 'drum amps') {
          const get = (p, d='—') => k => {
            try {
              const specs = (typeof k.specs === 'string') ? JSON.parse(k.specs) : (k.specs||{});
              const amp = specs.amp || {};
              const io  = specs.io  || {};
              switch(p){
                case 'watt':      return amp.watt_peak ?? d;
                case 'woofer':    return amp.woofer_in ?? d;
                case 'driver':    return amp.driver_in ?? d;
                case 'inputs':    return amp.inputs ?? d;
                case 'bt':        return amp.bluetooth ? 'Yes' : 'No';
                case 'hpf':       return io.hpf ? 'Yes' : 'No';
                case 'xlr_link':  return io.xlr_link ? 'Yes' : 'No';
                default: return d;
              }
            } catch { return d; }
          };
          return [
            ['Peak Power (W)',  get('watt')],
            ['Woofer (in)',     get('woofer')],
            ['HF Driver (in)',  get('driver')],
            ['Inputs (count)',  get('inputs')],
            ['Bluetooth',       get('bt')],
            ['HPF Switch',      get('hpf')],
            ['XLR Link Out',    get('xlr_link')],
          ];
        }

        // Otherwise fall back to original (kits, pads, headphones)
        return origRows(selected);
      };
      window.__BUILD_ROWS_WRAPPED = true;
    }
  });
})();
