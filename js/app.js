/* Investment Calculator: user interface. Reads the form, calls InvestmentLogic, renders results. */
(function(){
'use strict';
var L = window.InvestmentLogic;



  var $ = function(id){return document.getElementById(id)};
  var fmt2 = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  var fmt4 = new Intl.NumberFormat('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
  var cur = '₦';
  var radio = function(name){return document.querySelector('input[name="'+name+'"]:checked').value};
  var setRadio = function(name,val){document.querySelector('input[name="'+name+'"][value="'+val+'"]').checked=true};
  var num = function(id){var v=parseFloat($(id).value);return isNaN(v)?0:v};
  var amt = function(id){var v=parseFloat($(id).value.replace(/[^0-9.]/g,''));return isNaN(v)?0:v};
  var esc = function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var m = function(v){return typeof v==='number' ? cur+fmt2.format(L.round2(v)) : String(v)};
  var minus = function(v){return typeof v==='number' ? '− '+m(v) : String(v)};
  var dash = function(v){return (typeof v==='number' && L.round2(v)===0) ? '–' : m(v)};
  var summary = '';
  var touched = {};
  var drawerOn = function(){return $('tuOnP').checked};

  function group(title, items){
    return '<div class="grp"><h3>'+esc(title)+'</h3><dl class="res">'+items.map(function(i){
      return '<div class="'+(i[3]||'')+'"><dt>'+esc(i[0])+'</dt><dd class="'+(i[2]||'')+'">'+esc(i[1])+'</dd></div>';
    }).join('')+'</dl></div>';
  }
  function plain(groups){
    return groups.map(function(g){return g[0]+'\n'+g[1].map(function(i){return '  '+i[0]+': '+i[1]}).join('\n')}).join('\n');
  }
  function setNote(notes){var n=$('note'); if(notes.length){n.hidden=false;n.textContent=notes.join(' ')} else n.hidden=true}
  function addDays(d,n){ var x=new Date(Date.UTC(d.y,d.m,d.d+n)); return {y:x.getUTCFullYear(),m:x.getUTCMonth(),d:x.getUTCDate()}; }
  function fmtDate(d){
    return new Date(Date.UTC(d.y,d.m,d.d)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  }

  function settings(){
    return {w:num('sWht')/100, pen:num('sPen')/100, denR:num('sDenR')||365, denF:num('sDenF')||360, dpm:num('sDpm')||30, bonus:num('sBonus'), minP:num('sMinP'), minMonths:num('sMinM'), minDays:num('sMinD'), minMonthsQ:num('sMinMQ'), minMonthsB:num('sMinMB')};
  }

  function syncPyi(){
    var days = radio('tenorType')==='Days', flat = radio('rateType')==='Flat', pay = radio('payType');
    $('tenorLbl').textContent = days ? 'Tenor (days)' : 'Tenor (months)';
    $('tuDaysLbl').textContent = 'Days elapsed at top-up';
    $('rtHint').textContent = days
      ? (flat ? 'Flat: 360-day basis, actual days, no bonus.' : 'Regular: 365-day basis, actual days, no bonus.')
      : (flat ? 'Flat: 360-day basis, 30 days per month, no bonus.' : 'Regular: 365-day basis, 30 days per month, 5 bonus days per completed year.');
    var every = {Monthly:'30 days',Quarterly:'90 days',Biannual:'180 days'};
    $('ptHint').textContent = ({
      Maturity:'All interest is paid with the principal at the end.',
      Monthly:'Interest is paid every '+every.Monthly+'; the final payout carries any leftover days'+(days?'':' and the yearly bonus')+'.',
      Quarterly:'Interest is paid every '+every.Quarterly+(days?'':' (tenor must be a multiple of 3 months)')+'; the final payout carries any leftover days.',
      Biannual:'Interest is paid every '+every.Biannual+(days?'':' (tenor must be a multiple of 6 months)')+'; the final payout carries any leftover days.',
      Upfront:'Net interest, less the upfront penalty, is paid on the start date. The principal returns at maturity.'
    })[pay];
  }

  /* keep the replacement-investment defaults in step with the original until the user edits them */
  function mirrorReplacement(){
    if(!touched.rpRate) $('rpRate').value = $('rate').value;
    if(!touched.rpRT) $('rpRT').value = radio('rateType');
    $('rpPay').value = radio('payType')==='Upfront' ? 'Maturity' : radio('payType');   /* must match the original */
  }

  /* New terms tab: the tenure is worked out when the original maturity is kept, and typed in when it is extended */
  function syncTerms(mode, terms){
    var inMonths = radio('tenorType')==='Months', field=$('rpTenor');
    if(mode==='keep'){
      field.readOnly = true;
      field.value = terms.ok ? terms.tenure : '';
      $('rpTenorLbl').textContent = 'Tenure left ('+(terms.unit==='Months'?'months':'days')+')';
      $('rpHint').textContent = 'The original maturity is kept and the new tenure is the time left. Enter the top-up date and original maturity on the Top-up tab to count it from the dates (complete months x 30 days + leftover days). The payment type must match the original.';
    } else {
      if(field.readOnly){ field.readOnly=false; if(!touched.rpTenor) field.value = num('tenor')>0 ? num('tenor') : ''; }
      if(!touched.rpTenor) field.value = num('tenor')>0 ? num('tenor') : '';
      $('rpTenorLbl').textContent = 'New tenure ('+(inMonths?'months':'days')+')';
      $('rpHint').textContent = 'Choose a new tenure counted from the top-up date. Maturity moves out only if this goes past the original maturity. The payment type must match the original.';
    }
  }

  function renderPyi(){
    cur='₦'; syncPyi(); mirrorReplacement();
    var on = drawerOn(), scen = radio('tuTab')==='rollover' ? 'rollover' : 'topup';   /* only the open scenario is shown */
    var c = L.pyi({P:amt('principal'), T:num('tenor'), rate:num('rate')/100, rt:radio('rateType'), tt:radio('tenorType'), pay:radio('payType'),
      S:settings(), elapsed:Math.max(0,num('tuDays')), topUp:amt('tuAmt'), after:Math.max(0,num('daysAfter')), extra:amt('roExtra'), cash:amt('roCash')});
    var mode = radio('tuMode');
    var terms = L.topupTerms({tt:radio('tenorType'), T:num('tenor'), elapsed:Math.max(0,num('tuDays')), pay:radio('payType'), mode:mode,
      newTenure:num('rpTenor'), S:settings(), topDate:$('rpTopDate').value, matDate:$('rpMatDate').value});
    syncTerms(mode, terms);
    terms = L.topupTerms({tt:radio('tenorType'), T:num('tenor'), elapsed:Math.max(0,num('tuDays')), pay:radio('payType'), mode:mode,
      newTenure:num('rpTenor'), S:settings(), topDate:$('rpTopDate').value, matDate:$('rpMatDate').value});
    var notes=[];
    if(!(c.P>0)) notes.push('Enter a principal above zero.');
    else if(!c.ok) notes.push(c.check+'.');
    if(!(c.P>0) && !c.ok && c.check.indexOf('Minimum investment')!==0) notes.push(c.check+'.');

    var calc=[
      ['Principal',m(c.P)],
      ['Day-count denominator',String(c.den)],
      ['Daily interest',fmt4.format(c.daily)],
      ['Base interest days',String(c.baseDays)],
      ['Base interest',m(c.base)],
      ['Bonus days',String(c.bonusDays)],
      ['Bonus interest',dash(c.bonusRaw)],
      ['Total gross interest',m(c.gross),'pos','key'],
      ['Withholding tax (WHT)',minus(c.wht),'neg']
    ];
    if(c.upfront) calc.push(['Upfront penalty',minus(c.penalty),'neg']);
    calc.push(['Net interest',m(c.net),'pos','key']);
    calc.push(['Expected value (principal + net)',m(c.P+c.net),'','key']);

    if(!c.ok){
      $('heroLabel').textContent='Investment payable at maturity';
      $('heroVal').textContent='–';
      $('heroMeta').innerHTML='<span>Fix the highlighted input to see the full result</span>';
      $('res').innerHTML = group('Interest calculation',calc);
      $('schedPanel').hidden=false;
      $('sched').innerHTML='<tr><td colspan="10">Fix the highlighted input to see the schedule.</td></tr>';
      $('schedNote').textContent='';
      setNote(notes);
      summary='Premium Yield Investment\n'+c.check;
      return;
    }

    var up=c.upfront;
    $('heroLabel').textContent = up ? 'Upfront interest payout' : 'Investment payable at maturity';
    $('heroVal').textContent = m(up ? c.net : c.funds);
    $('heroMeta').innerHTML = '<span>Net interest <b>'+m(c.net)+'</b></span><span>Expected value <b>'+m(c.P+c.net)+'</b></span><span>Payouts <b>'+(up?'1 (on start date)':c.n)+'</b></span>';

    var pay=[['Number of interest payouts', up ? '1 (on start date)' : String(c.n)]];
    if(c.periodic){
      pay.push(['Gross per regular payout',m(c.regG)],['Net per regular payout',m(c.regN)]);
      if(c.bonusOn && c.bonusDays>0){
        pay.push(['Bonus added to each year-end payout',m(c.bonusEach)],['Gross on a year-end payout',m(c.yearEndG)],
                 ['Net on a year-end payout',m(c.yearEndN)],['Year-end payouts before the final one',String(c.yeb)]);
      }
      pay.push(['Final payout: remaining base interest',m(c.finalRem)]);
      if(c.bonusOn && c.bonusDays>0) pay.push(['Final payout: bonus included',dash(c.finalBonus)]);
    }
    pay.push(['Gross on final payout',m(c.finalG)],['WHT on final payout',minus(c.finalW)],['Net on final payout',m(c.finalN),'pos']);
    if(c.periodic) pay.push(['Total net across all payouts',m(c.totalNet)],['Summary net minus schedule total',m(c.recon)]);
    pay.push(['Investment balance at maturity',m(c.balance)],['Expected funds at maturity',m(c.funds),'','key']);

    var groups=[['Interest calculation',calc],['Payout schedule',pay]];
    var rep=null, repMat=null, topDate=L.parseISO($('rpTopDate').value);

    var t=c.tu;
    if(on && scen==='topup'){
      var tuG;
      if(t.allowed){
        tuG=[['Top-up allowed?','Yes (investment active)'],['Days elapsed at top-up date',String(t.el)],
          ['Gross interest accrued to date',m(t.accrued)],['Interest payouts already made',String(t.made)],
          ['Gross interest already paid out',dash(t.paid)],['Unpaid accrued gross interest',dash(t.unpaid)],
          ['WHT on unpaid accrued interest',t.wht ? minus(t.wht) : '–', t.wht?'neg':''],
          ['Net unpaid accrued interest',dash(t.net)],['Value carried into top-up',m(t.carried)],
          ['Top-up amount',t.amt ? m(t.amt) : '–'],['New principal after top-up',m(t.newP),'','key']];
      } else tuG=[['Top-up allowed?',t.msg]];
      groups.push(['Top-up (active, non-upfront)',tuG]);

      if(t.allowed){
        if(!terms.ok){
          groups.push(['Investment after top-up',[['New principal',m(t.newP)],['Check',terms.msg]]]);
          notes.push(terms.msg);
        } else {
          rep = L.pyi({P:t.newP, T:terms.tenure, tt:terms.unit, rate:num('rpRate')/100, rt:$('rpRT').value, pay:radio('payType'),
            S:Object.assign({},settings(),{minP:0,minMonths:0,minDays:0,minMonthsQ:0,minMonthsB:0}), elapsed:0, topUp:0, after:0, extra:0, cash:0});
          if(!rep.ok){
            groups.push(['Investment after top-up',[['New principal',m(t.newP)],['Check',rep.check]]]);
            notes.push(rep.check+'.'); rep=null;
          } else {
            repMat = terms.newMaturity;
            var unitWord = terms.unit==='Months' ? (terms.tenure===1?'month':'months') : (terms.tenure===1?'day':'days');
            var rg=[['New principal',m(rep.P),'','key']];
            if(repMat) rg.push(['New maturity date',fmtDate(repMat),'','key']);
            if(mode==='keep'){
              rg.push(['Time left on the original (days)',String(terms.remainingDays)]);
              if(terms.extendedDays>0) rg.push(['Extra days to complete the payout cycle','+ '+terms.extendedDays+' days','','key']);
            }
            rg.push(['New tenure',terms.tenure+' '+unitWord],['Day-count denominator',String(rep.den)],['Daily interest',fmt4.format(rep.daily)],
              ['Base interest days',String(rep.baseDays)],['Bonus days',String(rep.bonusDays)],['Total gross interest',m(rep.gross)],
              ['Withholding tax (WHT)',minus(rep.wht)],['Net interest',m(rep.net),'pos'],['Number of interest payouts',String(rep.n)]);
            if(rep.periodic) rg.push(['Gross per regular payout',m(rep.regG)]);
            rg.push(['Net on final payout',m(rep.finalN)],['Expected funds at maturity',m(rep.funds),'','key'],
              ['For reference: principal + full-term net',m(rep.P+rep.net)]);
            groups.push(['Investment after top-up',rg]);
          }
        }
      }

    }
    if(on && scen==='rollover'){
      var r=c.ro;
      var roG=[['Unpaid net interest at maturity',dash(r.unpaidNet)],['Days processed after maturity',String(r.after)],
        ['Post-maturity net interest',dash(r.postN)],['Full rollover: new principal',m(r.full),'','key'],
        ['Rollover with extra money: new principal',m(r.withExtra),'','key'],
        ['Part rollover: new principal',m(r.part),'','key'],['Part rollover: paid out to customer',dash(r.cashOut)]];
      groups.push(['Rollover (matured)',roG]);
      if(typeof r.part==='string') notes.push('Cash-out on part rollover is more than the rollover value.');
    }

    var sc = rep || c;
    if(rep){
      groups[0][0]='Original investment: interest calculation';
      groups[1][0]='Original investment: payout schedule';
      $('heroLabel').textContent='Investment payable at maturity, after top-up';
      $('heroVal').textContent=m(rep.funds);
      $('heroMeta').innerHTML='<span>New principal <b>'+m(rep.P)+'</b></span><span>Net interest <b>'+m(rep.net)+'</b></span><span>Payouts <b>'+rep.n+'</b></span>'
        +(repMat?'<span>New maturity <b>'+fmtDate(repMat)+'</b></span>':'');
    }
    $('sh').textContent = rep ? 'Payment schedule: replacement investment after top-up' : 'Payment schedule';
    $('res').innerHTML = groups.map(function(g){return group(g[0],g[1])}).join('');

    /* payment schedule: one row per payout */
    $('schedPanel').hidden=false;
    if(!sc.sched.length){
      $('sched').innerHTML='<tr><td colspan="10">'+sc.n.toLocaleString('en-US')+' payouts. The table is not listed for more than 1,000.</td></tr>';
    } else {
      var cum=0;
      $('sched').innerHTML = sc.sched.map(function(s){
        if(rep){ cum += (s.days||0); s = Object.assign({}, s, {when: topDate ? fmtDate(addDays(topDate,cum)) : 'Day '+cum+' after top-up'}); }
        var wht = s.penalty ? s.wht+s.penalty : s.wht;
        return '<tr><td>'+s.n+'</td><td>'+esc(s.when)+'</td><td>'+(s.days===null?'–':s.days)+'</td><td>'+dash(s.base)+'</td><td>'+dash(s.bonus)+
          '</td><td>'+dash(s.gross)+'</td><td>'+dash(wht)+'</td><td>'+dash(s.net)+'</td><td>'+(s.principal?m(s.principal):'–')+'</td><td>'+m(s.net+s.principal)+'</td></tr>';
      }).join('');
    }
    if(rep){
      var firstDue = rep.periodic ? rep.sched[0].days : rep.baseDays;
      $('schedNote').textContent = 'A new payout cycle starts on the top-up date. Interest earned on the original investment up to the top-up ('
        +m(t.net)+' net) is added to the new principal, so no payout is due until '+(topDate?fmtDate(addDays(topDate,firstDue)):'day '+firstDue+' after the top-up')+'.'
        +(terms.extendedDays>0?' The top-up stays for a full payout cycle, so maturity moves out by '+terms.extendedDays+' days.':'')
        +(rep.periodic?' Each payout\'s WHT and net are rounded on their own, so the schedule total can differ from the summary net by a kobo or two.':'');
    } else
    $('schedNote').textContent = sc.upfront ? 'The WHT column on the start date includes the upfront penalty of '+m(sc.penalty)+'.'
      : (sc.periodic ? 'Each payout\'s WHT and net are rounded on their own, so the schedule total can differ from the summary net by a kobo or two.' : '');

    setNote(notes);
    summary = 'Premium Yield Investment\n'+radio('rateType')+' | '+c.T+' '+radio('tenorType').toLowerCase()+' | '+c.pay+' | rate '+(c.rate*100).toFixed(2)+'%\n'+plain(groups);
  }

  function renderEdi(){
    cur='$';
    var on = $('tuOnE').checked;
    var c = L.edi({P:amt('ePrincipal'), T:num('eTenor'), rate:num('eRate')/100, flat:radio('ediRate')==='Flat', w:num('eWht')/100, pen:num('ePen')/100,
      elapsed:Math.max(0,num('eElapsed')), top:amt('eTop'), extra:amt('eExtra'), cash:amt('eCash'), minP:num('eMinP'), minDays:num('eMinD')});
    var notes=[];
    if(!(c.P>0)) notes.push('Enter a principal above zero.');
    if(!(c.T>0)) notes.push('Enter a tenor above zero.');
    else if(c.T%1!==0) notes.push('Tenor should be a whole number of days.');
    if(c.check!=='OK') notes.push(c.check+'.');
    $('heroLabel').textContent='Investment payable at maturity';
    $('heroVal').textContent = c.ok ? m(c.payable) : m(0);
    var meta='<span>Net interest <b>'+m(c.ok?c.net:0)+'</b></span>';
    if(on) meta+='<span>Available if liquidated now <b>'+m(c.ok?c.avail:0)+'</b></span><span>Status <b>'+(c.matured?'Matured':'Active')+'</b></span>';
    $('heroMeta').innerHTML=meta;

    var mat=[['Day-count denominator',String(c.den)],['Daily interest',fmt4.format(c.daily)],['Gross interest',m(c.gross),'pos','key'],
      ['Withholding tax (WHT)',minus(c.wht),'neg'],['Net interest',m(c.net),'pos','key'],['Expected maturity value',m(c.value),'','key'],
      ['Investment balance at maturity',m(c.balance)],['Investment payable at maturity',m(c.payable)]];
    var groups=[['At maturity',mat]];
    if(on){
      groups.push(['Early liquidation',[['Days elapsed',String(c.d)],['Status on that date',c.matured?'Matured':'Active'],
        ['Gross interest accrued',m(c.aG)],['WHT on accrued interest',minus(c.aW),'neg'],['Net interest accrued',m(c.aN),'pos'],
        ['Penalty rate applied',(c.pr*100).toFixed(2)+'%'],['Liquidation penalty',c.liqPen?minus(c.liqPen):'–',c.liqPen?'neg':''],
        ['Available value on liquidation',m(c.avail),'','key']]]);
      groups.push(['Top-up (active investments)', c.topAllowed ? [['Top-up allowed?',c.topMsg],['Existing principal',m(c.P)],
        ['Net interest accrued to top-up date',m(c.aN),'pos'],['Top-up amount',c.top?m(c.top):'–'],
        ['Replacement principal after top-up',m(c.newP),'','key']] : [['Top-up allowed?',c.topMsg]]]);
      groups.push(['Rollover (matured)',[['Rollover value at maturity (principal + net)',m(c.value)],['Full rollover: new principal',m(c.value),'','key'],
        ['Rollover with top-up: new principal',m(c.withTop),'','key'],['Part rollover: new principal',m(c.part),'','key'],
        ['Part rollover: paid out to customer',c.cashOut?m(c.cashOut):'–']]]);
      if(typeof c.part==='string') notes.push('Cash-out on part rollover is more than the rollover value.');
    }
    $('res').innerHTML = groups.map(function(g){return group(g[0],g[1])}).join('');
    $('schedPanel').hidden=true;
    setNote(notes);
    summary='Enhanced Dollar Investment\n'+(radio('ediRate'))+' | '+c.T+' days | maturity | rate '+(c.rate*100).toFixed(2)+'%\nPrincipal: '+m(c.P)+'\n'+plain(groups);
  }

  function render(){
    var p = radio('product');
    $('pyiForm').hidden = p!=='PYI';
    $('ediForm').hidden = p!=='EDI';
    $('tuBodyP').hidden = !$('tuOnP').checked;
    $('tuBodyE').hidden = !$('tuOnE').checked;
    var tab = radio('tuTab');
    $('tabTopup').hidden = tab!=='topup';
    $('tabReplacement').hidden = tab!=='replacement';
    $('tabRollover').hidden = tab!=='rollover';
    $('pyiSettings').hidden = p!=='PYI';
    $('ediSettings').hidden = p!=='EDI';
    if(p==='PYI') renderPyi(); else renderEdi();
  }

  document.addEventListener('input', function(e){
    var id = e.target && e.target.id;
    if(id==='rpRate'||id==='rpRT'||(id==='rpTenor' && !$('rpTenor').readOnly)) touched[id]=true;
  }, true);
  document.addEventListener('change', function(e){
    if(e.target && (e.target.id==='tuOnP'||e.target.id==='tuOnE')){ $('tuOnP').checked=e.target.checked; $('tuOnE').checked=e.target.checked; }
    if(e.target && e.target.name==='tenorType'){
      var d = e.target.value==='Days';
      if(num('tenor')===(d?3:190)) $('tenor').value = d?190:3;
      if(num('tuDays')===(d?45:60)) $('tuDays').value = d?60:45;
    }
  });
  document.addEventListener('input', render);
  document.addEventListener('change', render);
  ['principal','ePrincipal','tuAmt','roExtra','roCash','eTop','eExtra','eCash'].forEach(function(id){
    $(id).addEventListener('blur', function(){ var v=amt(id); if(v>0) $(id).value=fmt2.format(v); render(); });
  });
  $('copy').addEventListener('click', function(){
    var done=function(msg){$('copyMsg').textContent=msg;setTimeout(function(){$('copyMsg').textContent=''},2200)};
    try{ navigator.clipboard.writeText(summary).then(function(){done('Copied')},function(){done('Copy blocked by the browser')}); }
    catch(e){ done('Copy blocked by the browser'); }
  });
  render();
})();
