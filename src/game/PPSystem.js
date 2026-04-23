/**
 * PP System (Player Points)
 * Manages the PP bar and PP number based on judgments
 * 
 * PP Bar fills up with each hit. When full, PP number increases.
 * Perfect+: +0.5 bar (half fill)
 * Perfect: +0.2 bar (slight increase)
 * Great/Good: 0 (no change)
 * Ok: -0.3 bar (goes down)
 * Bad: -0.5 bar (starts dropping)
 * Miss: -0.8 bar (major drop), -5 PP number
 * 
 * PP number changes:
 * Perfect+: +0.5
 * Perfect: +0.25
 * Great/Good: 0
 * Ok: -0.5
 * Bad: -1
 * Miss: -5
 * 
 * PP can go below 0 but displays as 0.
 * To recover from negative: need to earn back to positive.
 */

export class PPSystem {
  constructor() {
    this.ppNumber = 0;       // Display PP value
    this.realPP = 0;         // Actual PP (can be negative)
    this.ppBar = 0;          // Current bar fill (0-1)
    this.maxBar = 1;         // Bar fills at 1.0
    
    // Judgment impacts on PP bar
    this.barImpacts = {
      perfectPlus: 0.5,
      perfect: 0.2,
      great: 0,
      good: 0,
      ok: -0.3,
      bad: -0.5,
      miss: -0.8
    };
    
    // Judgment impacts on PP number
    this.numberImpacts = {
      perfectPlus: 0.5,
      perfect: 0.25,
      great: 0,
      good: 0,
      ok: -0.5,
      bad: -1,
      miss: -5
    };
    
    // Callbacks for UI updates
    this.onBarChange = null;
    this.onNumberChange = null;
  }

  /**
   * Process a judgment and update PP
   * @param {string} judgmentType - Type of judgment
   * @returns {Object} Changes made to PP
   */
  processJudgment(judgmentType) {
    const barChange = this.barImpacts[judgmentType] || 0;
    const numberChange = this.numberImpacts[judgmentType] || 0;
    
    // Update bar
    this.ppBar += barChange;
    
    // Check if bar filled or emptied
    let numberBonus = 0;
    if (this.ppBar >= this.maxBar) {
      // Bar filled - add to number and reset bar
      numberBonus = 1;
      this.ppBar = 0;
    } else if (this.ppBar < 0) {
      // Bar emptied - subtract from number
      numberBonus = -1;
      this.ppBar = this.maxBar + this.ppBar; // Wrap around
    }
    
    // Keep bar in bounds (0-1)
    this.ppBar = Math.max(0, Math.min(1, this.ppBar));
    
    // Update real PP
    this.realPP += numberChange + numberBonus;
    
    // Display PP is max(0, realPP)
    const oldDisplay = this.ppNumber;
    this.ppNumber = Math.max(0, this.realPP);
    
    // Notify UI
    if (this.onBarChange) {
      this.onBarChange(this.ppBar);
    }
    if (this.onNumberChange && this.ppNumber !== oldDisplay) {
      this.onNumberChange(this.ppNumber);
    }
    
    return {
      barChange,
      numberChange: numberChange + numberBonus,
      newBar: this.ppBar,
      newNumber: this.ppNumber,
      realPP: this.realPP
    };
  }

  /**
   * Get current PP state
   */
  getState() {
    return {
      ppNumber: this.ppNumber,
      realPP: this.realPP,
      ppBar: this.ppBar,
      maxBar: this.maxBar
    };
  }

  /**
   * Reset PP system
   */
  reset() {
    this.ppNumber = 0;
    this.realPP = 0;
    this.ppBar = 0;
    
    if (this.onBarChange) this.onBarChange(0);
    if (this.onNumberChange) this.onNumberChange(0);
  }

  /**
   * Set callbacks for UI updates
   */
  setCallbacks(onBarChange, onNumberChange) {
    this.onBarChange = onBarChange;
    this.onNumberChange = onNumberChange;
  }
}
