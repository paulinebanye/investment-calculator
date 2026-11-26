/* Investment Calculator: calculation logic (no DOM, no dependencies).
   Loaded by index.html in the browser and by tests/ in Node. */
(function(root){
  /* Excel-style ROUND(x,2): half away from zero, decimal-aware so 1.005 -> 1.01 */
  function round2(x){
    if(typeof x!=='number' || !isFinite(x)) return x;
    var s = x<0 ? -1 : 1, a = Math.abs(x);
    if(a<1e-6) return 0;
    if(a>=1e15) return x;
    var p = Number(a.toPrecision(15));
    return s*Math.round(Number(p+'e2'))/100;
  }

  /* ---------- date helpers (UTC, no time zones) ---------- */
  function parseISO(s){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');
    return m ? {y:+m[1], m:+m[2]-1, d:+m[3]} : null;
  }
  function edate(dt, months){
    var t = dt.m+months, y = dt.y+Math.floor(t/12), mo = ((t%12)+12)%12;
    var dim = new Date(Date.UTC(y, mo+1, 0)).getUTCDate();
    return {y:y, m:mo, d:Math.min(dt.d, dim)};
  }
  function addDays(dt, n){
    var x = new Date(Date.UTC(dt.y, dt.m, dt.d + n));
    return {y:x.getUTCFullYear(), m:x.getUTCMonth(), d:x.getUTCDate()};
  }
  /* Time between two dates as the product counts it: each complete month is 30 interest days, plus the leftover days.
     25 Nov 2026 to 18 Feb 2027 = 2 complete months + 24 days = 84 days (matches the staff top-up screen). */
  function spanDays(a, b, dpm){
    var m = 0;
    while(cmpDate(edate(a, m+1), b) <= 0) m++;
    var anchor = edate(a, m);
    var left = Math.round((Date.UTC(b.y,b.m,b.d) - Date.UTC(anchor.y,anchor.m,anchor.d)) / 86400000);
    return m*dpm + left;
  }
  function cmpDate(a,b){ return (a.y-b.y) || (a.m-b.m) || (a.d-b.d); }

  /* ---------- Premium Yield: mirrors 'Premium Yield Investment' + 'Repayment Schedule' sheets ----------
     i: {P,T,rate,rt:'Regular'|'Flat',tt:'Months'|'Days',pay:'Maturity'|'Monthly'|'Quarterly'|'Biannual'|'Upfront',
         S:{w,pen,denR,denF,dpm,bonus}, elapsed,topUp,after,extra,cash}                                          */
  function pyi(i){
    var r2=round2, S=i.S, w=S.w;
    var P=i.P, T=i.T, rate=i.rate, months=i.tt==='Months', flat=i.rt==='Flat', pay=i.pay;
    var den = flat ? S.denF : S.denR;
    var daily = P*rate/den;
    var size = pay==='Monthly'?1 : pay==='Quarterly'?3 : pay==='Biannual'?6 : 0;
    var periodic = size>0, upfront = pay==='Upfront', dpp = size*S.dpm;

    /* minimum tenor: a floor for every investment, higher for quarterly (6 months) and biannual (12 months) interest.
       Day tenors use the same minimum counted in 30-day months (180 and 360 days). */
    var payMin = pay==='Quarterly' ? (S.minMonthsQ||0) : pay==='Biannual' ? (S.minMonthsB||0) : 0;
    var minM = Math.max(S.minMonths||0, payMin), minD = Math.max(S.minDays||0, payMin*S.dpm);
    var check='OK';
    if(!(T>0) || T%1!==0) check='Tenor must be a positive whole number';
    else if(months && minM>0 && T<minM) check='Minimum tenor is '+minM+' months'+(payMin*1>(S.minMonths||0) ? ' for '+pay.toLowerCase()+' interest' : '');
    else if(!months && minD>0 && T<minD) check='Minimum tenor is '+minD+' days'+(payMin*S.dpm>(S.minDays||0) ? ' for '+pay.toLowerCase()+' interest' : '');
    else if(months && size>1 && T%size!==0) check='Tenor must be a multiple of '+size+' months';
    else if((S.minP||0)>0 && !(P>=S.minP)) check='Minimum investment is ₦'+S.minP.toLocaleString('en-US');

    var baseDays = months ? T*S.dpm : T;
    var bonusOn = months && !flat;                       /* bonus: regular month tenors only */
    var bonusDays = bonusOn ? Math.floor(T/12)*S.bonus : 0;
    var base = daily*baseDays, bonusRaw = daily*bonusDays, grossRaw = base+bonusRaw;   /* full precision */
    var gross = r2(grossRaw), wht = r2(grossRaw*w);
    var penalty = upfront ? r2(grossRaw*S.pen) : 0;
    var net = upfront ? r2(grossRaw*(1-w) - grossRaw*S.pen) : r2(grossRaw*(1-w));      /* rounded once */

    var c = {ok:check==='OK', check:check, P:P, T:T, rate:rate, pay:pay, months:months, flat:flat, periodic:periodic,
      upfront:upfront, bonusOn:bonusOn, size:size, dpp:dpp, den:den, daily:daily, baseDays:baseDays, base:base,
      bonusDays:bonusDays, bonusRaw:bonusRaw, grossRaw:grossRaw, gross:gross, wht:wht, penalty:penalty, net:net,
      expected:P+net};
    if(!c.ok) return c;

    /* ----- payout schedule ----- */
    var n = !periodic ? 1 : (months ? T/size : Math.ceil(T/dpp));
    var regG, regN, bonusEach='n/a', yearEndG='n/a', yearEndN='n/a', yeb=0, finalRem, finalBonus, finalG, finalW, finalN, totalNet;
    if(!periodic){
      regG = gross; regN = net;
      finalRem = base; finalBonus = bonusRaw;
      finalG = r2(finalRem+finalBonus);
      finalW = upfront ? wht : r2((finalRem+finalBonus)*w);
      finalN = net;
      totalNet = finalN;
    } else {
      regG = r2(daily*dpp);
      regN = r2(regG*(1-w));
      if(bonusOn){
        bonusEach = daily*S.bonus;
        yearEndG = regG+bonusEach;
        yearEndN = r2(yearEndG*(1-w));
        yeb = Math.floor(T/12) - (T%12===0 ? 1 : 0);
      }
      finalRem = base-(n-1)*regG;
      finalBonus = (bonusOn && T%12===0) ? bonusEach : 0;
      finalG = r2(finalRem+finalBonus);
      finalW = r2((finalRem+finalBonus)*w);
      finalN = r2((finalRem+finalBonus)*(1-w));
      totalNet = bonusOn ? (n-1-yeb)*regN + yeb*yearEndN + finalN : (n-1)*regN + finalN;
    }
    var recon = r2(net-totalNet);
    var balance = upfront ? P : P+finalG;
    var funds   = upfront ? P : P+finalN;

    /* one row per payout (Repayment Schedule sheet) */
    var sched = [];
    if(n<=1000){
      if(periodic){
        for(var k=1;k<=n;k++){
          var D = k<n ? regG : base-(n-1)*regG;
          var E = (bonusOn && (k*size)%12===0) ? daily*S.bonus : 0;
          sched.push({n:k, when: months ? 'Month '+(k*size) : 'Day '+Math.min(k*dpp,T),
            days: k<n ? dpp : baseDays-(n-1)*dpp, base:D, bonus:E, gross:r2(D+E), wht:r2((D+E)*w), net:r2((D+E)*(1-w)),
            principal: k===n ? P : 0});
        }
      } else if(upfront){
        sched.push({n:1, when:'Start date', days:baseDays, base:base, bonus:bonusRaw, gross:gross, wht:wht, penalty:penalty, net:net, principal:0});
        sched.push({n:2, when:'At maturity', days:null, base:0, bonus:0, gross:0, wht:0, net:0, principal:P});
      } else {
        sched.push({n:1, when: months ? 'Month '+T : 'Day '+T, days:baseDays, base:base, bonus:bonusRaw, gross:gross, wht:wht, net:net, principal:P});
      }
    }

    /* ----- top-up (active, non-upfront) ----- */
    var el = Math.min(i.elapsed, baseDays);
    var tuMsg = upfront ? 'No: upfront investments cannot be topped up' : (el>=baseDays ? 'No: investment has matured' : 'Yes');
    var accrued = bonusOn ? daily*(el + Math.floor(el/(12*S.dpm))*S.bonus) : daily*el;
    var made = periodic ? Math.min(Math.floor(el/dpp), n-1) : (upfront ? 1 : 0);
    var paid = upfront ? grossRaw
             : (periodic ? made*regG + (bonusOn ? Math.floor(made*size/12)*bonusEach : 0) : 0);
    var unpaid = Math.max(accrued-paid, 0), unpaidW = unpaid*w, unpaidN = r2(unpaid-unpaidW);
    var carried = P+unpaidN;
    var newP = tuMsg==='Yes' ? carried+i.topUp : 'Not allowed';

    /* ----- rollover (matured) ----- */
    var unpaidNet = upfront ? 0 : finalN;
    var postN = r2(daily*i.after*(1-w));
    var full = P+unpaidNet+postN;
    var withExtra = full+i.extra;
    var part = i.cash>full ? 'Cash-out exceeds value' : full-i.cash;
    var cashOut = Math.min(i.cash, full);

    c.n=n; c.regG=regG; c.regN=regN; c.bonusEach=bonusEach; c.yearEndG=yearEndG; c.yearEndN=yearEndN; c.yeb=yeb;
    c.finalRem=finalRem; c.finalBonus=finalBonus; c.finalG=finalG; c.finalW=finalW; c.finalN=finalN;
    c.totalNet=totalNet; c.recon=recon; c.balance=balance; c.funds=funds; c.sched=sched;
    c.tu={allowed:tuMsg==='Yes', msg:tuMsg, el:el, accrued:accrued, made:made, paid:paid, unpaid:unpaid, wht:unpaidW, net:unpaidN,
          carried:carried, amt:i.topUp, newP:newP};
    c.ro={unpaidNet:unpaidNet, after:i.after, postN:postN, full:full, withExtra:withExtra, part:part, cashOut:cashOut};

    /* flat list in the sheet's own order and wording (used to test against the workbook) */
    c.rows = [
      ['Principal',P],['Tenor',T],['Tenor check',check],['Rate',rate],['Annual denominator',den],['Daily interest',daily],
      ['Base interest days',baseDays],['Base interest',base],['Bonus days',bonusDays],['Bonus interest',bonusRaw],
      ['Total gross interest',gross],['Withholding Tax (WHT)',wht],['Upfront penalty',penalty],['Net interest (summary)',net],
      ['Expected value (principal + net)',P+net],
      ['Number of interest payouts',n],['Gross per regular payout',regG],['Net per regular payout',regN],
      ['Bonus added to each year-end payout',bonusEach],['Gross on a year-end payout (regular + bonus)',yearEndG],
      ['Net on a year-end payout',yearEndN],['Year-end payouts before the final one',yeb],
      ['Final payout: remaining base interest',finalRem],['Final payout: bonus included',finalBonus],
      ['Gross on final payout',finalG],['WHT on final payout',finalW],['Net on final payout',finalN],
      ['Total net across all payouts',totalNet],['Summary net minus schedule total',recon],
      ['Investment balance at maturity',balance],['Expected funds at maturity',funds],
      ['Days elapsed at top-up date',el],['Top-up allowed?',tuMsg],['Gross interest accrued to date',accrued],
      ['Interest payouts already made',made],['Gross interest already paid out',paid],['Unpaid accrued gross interest',unpaid],
      ['WHT on unpaid accrued interest',unpaidW],['Net unpaid accrued interest (rounded once)',unpaidN],
      ['Value carried into top-up',carried],['Top-up amount',i.topUp],['New principal after top-up',newP],
      ['Unpaid net interest at maturity',unpaidNet],['Days processed after maturity',i.after],['Post-maturity net interest',postN],
      ['Full rollover: new principal',full],['Rollover with extra money: new principal',withExtra],
      ['Part rollover: new principal',part],['Part rollover: paid out to customer',cashOut]
    ];
    return c;
  }

  /* ---------- Replacement investment after a top-up: mirrors the 'Top-up Check' sheet, section 4 ----------
     o: {newP, rate, tenure (months), pay:'Maturity'|'Monthly'|'Quarterly'|'Biannual', rt, S, topDate, matDate} */
  function replacement(o){
    var r2=round2, S=o.S, w=S.w, T=o.tenure;
    var size = o.pay==='Monthly'?1 : o.pay==='Quarterly'?3 : o.pay==='Biannual'?6 : T;
    var r = {ok:true, msg:''};
    var matDate = parseISO(o.matDate), topDate = parseISO(o.topDate);
    if(!(T>0) || T%1!==0){ r.ok=false; r.msg='Enter the new tenure as a whole number of months.'; }
    else if(o.pay!=='Maturity' && T%size!==0){ r.ok=false; r.msg='New tenure must be a multiple of '+size+' months for '+o.pay.toLowerCase()+' interest.'; }
    r.newMaturity = null;
    if(matDate && topDate && T>0 && T%1===0){
      var cand = edate(topDate, T);
      r.newMaturity = cmpDate(cand, matDate)>0 ? cand : matDate;
    }
    if(!r.ok) return r;
    var den = o.rt==='Regular' ? S.denR : S.denF;
    var daily = o.newP*o.rate/den;
    var baseDays = T*S.dpm;
    var bonusDays = o.rt==='Regular' ? Math.floor(T/12)*S.bonus : 0;
    var raw = daily*(baseDays+bonusDays);
    var n = o.pay==='Maturity' ? 1 : T/size;
    var regG = o.pay==='Maturity' ? r2(raw) : r2(daily*size*S.dpm);
    var finalFull = o.pay==='Maturity' ? raw
                  : daily*baseDays-(n-1)*regG + ((bonusDays>0 && T%12===0) ? daily*S.bonus : 0);
    var finalN = r2(finalFull*(1-w));
    r.newP=o.newP; r.daily=daily; r.baseDays=baseDays; r.bonusDays=bonusDays;
    r.gross=r2(raw); r.wht=r2(raw*w); r.net=r2(raw*(1-w));
    r.n=n; r.regG=regG; r.finalFull=finalFull; r.finalN=finalN;
    r.funds=o.newP+finalN; r.ref=o.newP+r.net; r.den=den;
    return r;
  }

  /* ---------- Terms of the new investment that replaces the original after a top-up ----------
     Rules from the product owner (not in the workbook):
       - the payment type and the tenure unit (months or days) match the original investment
       - keep the original maturity: the new tenure is the time remaining. The product owner also described rounding it
         up to whole payout periods so every investment completes its payout cycle (10 days left on a monthly
         investment: the top-up stays a full 30 days, maturity moves out 20 days). This always applies: the backend
         only allows whole payout cycles (quarterly = multiples of 3 months), so a new tenure can never be shorter
       - extend: the customer picks a new tenure, counted from the top-up date
     o: {tt, T, elapsed, pay, mode:'keep'|'extend', newTenure, S, topDate, matDate}  (dates are ISO strings, optional) */
  function topupTerms(o){
    var S=o.S, months=o.tt==='Months', dpm=S.dpm;
    var size = o.pay==='Monthly'?1 : o.pay==='Quarterly'?3 : o.pay==='Biannual'?6 : 0;
    var period = size*dpm;
    var baseDays = months ? o.T*dpm : o.T;
    var el = Math.min(Math.max(o.elapsed||0,0), baseDays), remaining = baseDays-el;
    var r = {ok:true, msg:'', mode:o.mode, remainingDays:remaining, periodDays:period, extendedDays:0,
             unit:o.tt, tenure:0, days:0, newMaturity:null};
    var matDate = parseISO(o.matDate), topDate = parseISO(o.topDate);
    if(o.mode!=='extend' && topDate && matDate && cmpDate(matDate, topDate) > 0){
      remaining = spanDays(topDate, matDate, dpm);       /* both dates entered: count the time left from the dates */
      r.remainingDays = remaining; r.fromDates = true;
    }
    if(o.mode==='extend'){
      var nt=o.newTenure;
      if(!(nt>0) || nt%1!==0){ r.ok=false; r.msg='Enter the new tenure as a whole number of '+(months?'months':'days')+'.'; return r; }
      if(size>1){                                   /* quarterly / biannual run in whole payout cycles: 3, 6, 9... months (90, 180, 270... days) */
        var unitSize = months ? size : period, unitName = months ? 'months' : 'days';
        if(nt < unitSize){ r.ok=false; r.msg='New tenure must be at least '+unitSize+' '+unitName+' for '+o.pay.toLowerCase()+' interest.'; return r; }
        if(nt % unitSize !== 0){ r.ok=false; r.msg='New tenure must be a multiple of '+unitSize+' '+unitName+' for '+o.pay.toLowerCase()+' interest.'; return r; }
      }
      r.tenure=nt; r.days = months ? nt*dpm : nt;
      if(topDate && matDate){
        var cand = months ? edate(topDate,nt) : addDays(topDate,nt);
        if(cmpDate(cand,matDate)<0){
          r.ok=false; r.msg='The new maturity date cannot be earlier than the current maturity date. Choose a longer tenure, or keep the current maturity.'; return r;
        }
        r.newMaturity = cand;
      }
      return r;
    }
    /* keep the original maturity */
    var days = remaining;
    if(period>0 && remaining>0) days = Math.ceil(remaining/period)*period;   /* backend rule: quarterly/biannual/monthly investments run in whole payout cycles */
    r.extendedDays = days-remaining; r.days = days;
    /* express it in months only when that suits the payment type; otherwise count it in days (the last payout then covers any leftover days) */
    if(months && days%dpm===0 && (size<=1 || (days/dpm)%size===0)){ r.unit='Months'; r.tenure=days/dpm; } else { r.unit='Days'; r.tenure=days; }
    if(matDate) r.newMaturity = addDays(matDate, r.extendedDays);
    return r;
  }

  /* ---------- EDI: mirrors the 'EDI Investment' sheet ----------
     i: {P,T,rate,flat,w,pen,elapsed,top,extra,cash} */
  function edi(i){
    var r2=round2, P=i.P, T=i.T, w=i.w;
    var check='OK';                                           /* minimums are product settings, not in the workbook */
    if((i.minP||0)>0 && P>0 && P<i.minP) check='Minimum investment is $'+i.minP.toLocaleString('en-US');
    else if((i.minDays||0)>0 && T>0 && T<i.minDays) check='Minimum tenor is '+i.minDays+' days';
    var den = i.flat ? 360 : 365, daily = P*i.rate/den;
    var gross = r2(daily*T), wht = r2(gross*w), net = r2(gross-wht), value = P+net;
    var d = Math.min(i.elapsed, T), matured = d>=T;
    var aG = daily*d, aW = aG*w, aN = r2(aG-aW);                 /* full precision, net rounded once */
    var pr = matured ? 0 : i.pen, liqPen = r2(aN*pr), avail = P+aN-liqPen;
    var topMsg = matured ? 'No: only active EDI can be topped up' : 'Yes (investment active)';
    var part = i.cash>value ? 'Cash-out exceeds value' : value-i.cash;
    return {ok:P>0&&T>0&&check==='OK', check:check, P:P, T:T, rate:i.rate, den:den, daily:daily, gross:gross, wht:wht, net:net, value:value,
      balance:P+gross, payable:P+net, d:d, matured:matured, aG:aG, aW:aW, aN:aN, pr:pr, liqPen:liqPen, avail:avail,
      topAllowed:!matured, topMsg:topMsg, top:i.top, newP:P+aN+i.top, withTop:value+i.extra, part:part,
      cashOut:Math.min(i.cash,value), extra:i.extra, cash:i.cash};
  }

  var api = {round2:round2, pyi:pyi, replacement:replacement, topupTerms:topupTerms, edi:edi, parseISO:parseISO, edate:edate, addDays:addDays, spanDays:spanDays};
  if(typeof module!=='undefined' && module.exports) module.exports = api;   /* Node (tests) */
  else root.InvestmentLogic = api;                                          /* browser */

})(this);
