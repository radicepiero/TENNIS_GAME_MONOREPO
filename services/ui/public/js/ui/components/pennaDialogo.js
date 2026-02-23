// pennaDialogo.js
import { ensureStyleLoaded } from "/js/utils.js";

export class PennaDialogo {
  constructor(container, options = {}) {
    //opzioni di default
    const defaults = {
      styleSheet: "/css/pennaDialogo.css",
      title: "Seleziona tennista",
      placeholder: "Cerca...",
      options: [{ value: "de", paese: "Germania" }],
      managedOptionValue: "id",
      managedOptionText: "name",
      onConfirm: (selected) => console.log("Selezionato:", selected),
      onCancel: () => console.log("Operazione annullata"),
    };
    //determino la configurazione partendo dalle default
    //e aggiungendo o sostituendo con quelle passate
    this.config = { ...defaults, ...options };
    //se container è una stringa la cerco altrimenti assumo
    //che sia un oggetto del dom
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    this.selectedValue = null;

    this.init();
  }

  init() {
    //se lo stile è già caricato non lo carico
    if (this.config.styleSheet) {
      ensureStyleLoaded(this.config.styleSheet);
    }
    this.render();
    this.bindEvents();
  }

  render() {
    // Pulisci il container
    this.container.replaceChildren();

    // Crea elementi
    const overlay = document.createElement("div");
    overlay.className = "penna-overlay";

    const dialogo = document.createElement("div");
    dialogo.className = "penna-dialogo";

    const title = document.createElement("h2");
    title.className = "dialog-title";
    title.textContent = this.config.title;

    const searchContainer = document.createElement("div");
    searchContainer.className = "penna-search-container";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "penna-search-input";
    searchInput.placeholder = this.config.placeholder;

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "penna-options-container";

    // Genera le opzioni usando managedOptionValue e managedOptionText
    this.config.options.forEach((opt) => {
      const option = document.createElement("div");
      option.className = "penna-option";
      option.dataset.value = opt[this.config.managedOptionValue];
      option.textContent = opt[this.config.managedOptionText];
      option.addEventListener("click", () => this.selectOption(option));
      optionsContainer.appendChild(option);
    });

    // Aggiungi elementi al DOM
    searchContainer.append(searchInput, optionsContainer);

    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "penna-buttons";

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "penna-conferma";
    confirmBtn.textContent = "Conferma";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "penna-annulla";
    cancelBtn.textContent = "Annulla";

    buttonsContainer.append(confirmBtn, cancelBtn);
    dialogo.append(title, searchContainer, buttonsContainer);
    this.container.append(overlay, dialogo);

    // Salva i riferimenti
    this.elements = {
      overlay,
      dialogo,
      searchInput,
      optionsContainer,
      conferma: confirmBtn,
      annulla: cancelBtn,
    };
  }

  bindEvents() {
    this.elements.searchInput.addEventListener("input", (e) =>
      this.filterOptions(e.target.value)
    );

    this.elements.conferma.addEventListener("click", () =>
      this.handleConfirm()
    );
    this.elements.annulla.addEventListener("click", () => this.handleCancel());
    this.elements.overlay.addEventListener("click", () => this.handleCancel());
  }

  filterOptions(searchTerm) {
    const options =
      this.elements.optionsContainer.querySelectorAll(".penna-option");
    const term = searchTerm.toLowerCase();

    options.forEach((opt) => {
      const text = opt.textContent.toLowerCase();
      opt.style.display = text.includes(term) ? "block" : "none";
    });
  }

  selectOption(optionElement) {
    const selectedValue = optionElement.dataset.value;
    this.selectedOption = this.config.options.find(
      (opt) =>
        String(opt[this.config.managedOptionValue]) === String(selectedValue)
    );

    // Aggiornamento UI
    this.elements.optionsContainer
      .querySelectorAll(".penna-option")
      .forEach((opt) => {
        opt.classList.remove("selected");
      });
    optionElement.classList.add("selected");
    this.elements.searchInput.value = optionElement.textContent;
  }

  handleConfirm() {
    if (this.selectedOption) {
      //console.log("Confermato:", this.selectedOption); // Debug
      this.config.onConfirm(this.selectedOption);
    } else {
      console.warn("Nessuna opzione selezionata");
    }
    this.close();
  }

  handleCancel() {
    this.config.onCancel();
    this.close();
  }

  open(paramsOpen = {}) {
    this.container.style.display = "block";
    this.elements.dialogo.style.display = "block";
    this.elements.overlay.style.display = "block";
    this.elements.searchInput.focus();
    this.config.onConfirm = paramsOpen.operazione;
  }

  close() {
    this.container.style.display = "none";
    this.elements.dialogo.style.display = "none";
    this.elements.overlay.style.display = "none";
    this.elements.searchInput.value = "";
    this.selectedValue = null;
    this.filterOptions("");
  }
}
