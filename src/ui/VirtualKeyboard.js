/**
 * Virtual Keyboard
 * On-screen QWERTY keyboard for VR and touch input
 */

export class VirtualKeyboard {
  constructor() {
    this.container = null;
    this.display = null;
    this.currentInput = null;
    this.onSubmit = null;
    this.value = '';
    this.isVisible = false;
    
    // Key layout
    this.layout = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'SPACE', 'BACKSPACE', 'ENTER']
    ];
  }

  init() {
    this.container = document.getElementById('virtual-keyboard');
    if (!this.container) return;
    
    this.display = this.container.querySelector('.keyboard-display');
    
    // Setup key buttons
    const keys = this.container.querySelectorAll('.kb-key');
    keys.forEach(key => {
      key.addEventListener('click', () => this.handleKeyPress(key.textContent));
    });
    
    // Hide initially
    this.hide();
  }

  show(inputElement, onSubmit) {
    this.currentInput = inputElement;
    this.onSubmit = onSubmit;
    this.value = inputElement ? inputElement.value : '';
    this.isVisible = true;
    
    if (this.container) {
      this.container.classList.remove('hidden');
    }
    
    this.updateDisplay();
  }

  hide() {
    this.isVisible = false;
    
    if (this.container) {
      this.container.classList.add('hidden');
    }
    
    this.currentInput = null;
    this.onSubmit = null;
  }

  handleKeyPress(key) {
    switch (key) {
      case 'SPACE':
        this.value += ' ';
        break;
        
      case '⌫':
      case 'BACKSPACE':
        this.value = this.value.slice(0, -1);
        break;
        
      case 'ENTER':
        this.submit();
        return;
        
      default:
        this.value += key;
    }
    
    this.updateDisplay();
    
    // Update input element if exists
    if (this.currentInput) {
      this.currentInput.value = this.value;
      this.currentInput.dispatchEvent(new Event('input'));
    }
  }

  updateDisplay() {
    if (this.display) {
      this.display.textContent = this.value || 'Type here...';
    }
  }

  submit() {
    if (this.onSubmit) {
      this.onSubmit(this.value);
    }
    
    this.hide();
  }

  // VR-specific methods
  setupVRInteraction() {
    // This would integrate with the VR controller raycasting
    // to allow pointing at keys and pressing with trigger
  }

  // Position keyboard in 3D space (for VR)
  set3DPosition(position, rotation) {
    // If using a 3D UI system, position the keyboard
  }

  // Toggle shift/caps
  toggleShift() {
    // Toggle between uppercase and lowercase
  }

  // Toggle symbols
  toggleSymbols() {
    // Switch to symbol layout
  }
}
