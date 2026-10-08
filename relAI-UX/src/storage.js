const KEY='future-self-ux-v4';
export function createDemoStorage(seed) {
  let volatile=null;
  return {
    load() {
      try {
        const value=JSON.parse(localStorage.getItem(KEY));
        if(value?.version===4&&Array.isArray(value.tasks)){
          // Remove the former 80 HP demo head start once, preserving earned progress,
          // tasks, evidence and uploaded documents. New profiles begin at 0 HP.
          if(value.energyRules!==5){value.hp=Math.max(0,Math.min(100,Number(value.hp||0)-80));value.energyRules=5;}
          return {...seed(),...value,peakHP:value.peakHP??value.hp};
        }
      } catch {}
      return volatile||seed();
    },
    save(value) {
      volatile=structuredClone(value);
      try { localStorage.setItem(KEY,JSON.stringify(value)); return true; }
      catch { return false; }
    }
  };
}
