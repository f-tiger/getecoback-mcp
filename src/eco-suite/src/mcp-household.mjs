import {measured, replacement} from '../site/assets/household-math.mjs';
import {laundry, laundryShareText, laundrySingle, laundrySingleShareText, LAUNDRY_SHARE_URL, LAUNDRY_SINGLE_SHARE_URL} from '../site/assets/laundry-math.mjs';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const price = number('Eigener Strompreis in EUR/kWh.', 0, 5);
export const householdSuite = [
  {
    name:'strommessung_hochrechnen', description:'Steckdosenmessung auf Nutzungstage hochrechnen — Project meter readings across representative days.',
    page:'/strommess-protokoll.html', example:{args:{kwh:2,hours:24,days:100,price:0.3},expect:{eur_for_period:60}}, properties:{kwh:number('Gemessene Energie in kWh.',0,10000), hours:number('Messdauer in Stunden.',0.01,8760), days:number('Vergleichbare Betriebstage.',0,366),price},
    calculate(args) {
      const r=measured(args);
      return {kwh_per_day:r.daily, kwh_for_period:r.annual, eur_for_period:r.cost, assumption:'Nur für Tage mit vergleichbarem Betrieb.'};
    }
  },
  {
    name:'geraetewechsel_rechnen', description:'Altgerät behalten oder ersetzen — Compare the cost of keeping an appliance with replacing it.',
    page:'/geraete-austausch-rechner.html', example:{args:{oldKwh:400,newKwh:200,purchase:300,years:10,price:0.3},expect:{payback_years:5}}, properties:{oldKwh:number('Jahresverbrauch Altgerät in kWh.',0,20000),newKwh:number('Jahresverbrauch Ersatzgerät in kWh.',0,20000),purchase:number('Anschaffungskosten in Euro.',0,50000),years:number('Vergleichszeitraum in Jahren.',1,30),price},
    calculate(args) {
      const r=replacement(args);
      return {keep_eur:r.keep, replace_eur:r.buy, annual_saving_eur:r.saving,payback_years:r.payback,assumption:'Gleiche Nutzung, konstanter Tarif; ohne Reparaturen und Restwert.'};
    }
  },
  {
    name:'waesche_trocknungskosten', description:'Messwerte für zwei Trocknungswege vergleichen — Compare measured energy costs for equally dry laundry.',
    page:'/waeschetrockner-oder-luftentfeuchter.html', example:{args:{dryer:2,dehum:1,price:0.3,comparable:false},expect:{lower_cost:'unconfirmed'}}, properties:{dryer:number('Trockner: kWh pro Ladung.',0,20),dehum:number('Entfeuchter: gemessene kWh pro Ladung.',0,100),comparable:{type:'boolean',description:'Gleiche Wäschemenge und Endtrockenheit erreicht?'},price},
    calculate(args) {
      const input = {...args, dryerBasis:'cycle', method:'measured', currency:'EUR', loads:0, purchase:0};
      const r = laundry(input);
      return {
        dryer_eur_per_load:r.dryerCost,
        dehumidifier_eur_per_load:r.dehumCost,
        lower_cost:r.winner,
        assumption:'Bei unterschiedlicher Endtrockenheit bleibt der Vergleich offen.',
        share_text_de:laundryShareText(input, 'entered'),
        share_url:LAUNDRY_SHARE_URL,
      };
    }
  },
  {
    name:'luftentfeuchter_waesche_einzelkosten',
    description:'Berechne nur die Stromkosten des Entfeuchters pro Wäscheladung aus gemessenen kWh oder gemessener mittlerer Leistung und Laufzeit. Keine Vergleichskosten erforderlich — Calculate a single dehumidifier drying run without assuming a dryer reading.',
    page:'/waeschetrockner-oder-luftentfeuchter.html',
    guide_url:LAUNDRY_SINGLE_SHARE_URL,
    properties:{
      method:{type:'string',enum:['measured','estimate'],description:'measured: vollständige kWh-Messung. estimate: gemessene mittlere Leistungsaufnahme × Laufzeit.'},
      dehum:number('Gemessene kWh des vollständigen Entfeuchter-Durchgangs.',0,100),
      watts:number('Gemessene mittlere Leistungsaufnahme in Watt über den Durchgang; keine Nennleistung vom Typenschild.',0,5000),
      hours:number('Zugehörige Laufzeit in Stunden.',0,72),
      price,
    },
    required:['method','price'],
    oneOf:[
      {properties:{method:{const:'measured'},watts:false,hours:false},required:['dehum']},
      {properties:{method:{const:'estimate'},dehum:false},required:['watts','hours']},
    ],
    example:{args:{method:'measured',dehum:1.8,price:0.35},expect:{kwh:1.8,cost:0.63,basis:'measured'}},
    calculate(input) {
      const {kwh,cost}=laundrySingle(input);
      return {kwh,cost,basis:input.method,share_text_de:laundrySingleShareText(input),share_url:LAUNDRY_SINGLE_SHARE_URL};
    }
  }
];
