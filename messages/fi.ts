export const fi = {
  app: {
    name: "JKG",
    tagline: "Suunnistusviestien joukkuekuvat Instagramia varten",
  },
  nav: {
    teams: "Joukkuekuvat",
    athletes: "Urheilijat",
    templates: "Mallit",
    signOut: "Kirjaudu ulos",
    menu: "Valikko",
  },
  signIn: {
    title: "Kirjaudu sisään",
    subtitle: "Käytä rekisteröitynyttä sähköpostia ja salasanaa.",
    emailLabel: "Sähköposti",
    passwordLabel: "Salasana",
    nameLabel: "Nimi",
    submitSignIn: "Kirjaudu sisään",
    submitSignUp: "Rekisteröidy",
    toggleToSignUp: "Eikö sinulla ole tiliä? Rekisteröidy",
    toggleToSignIn: "Onko sinulla jo tili? Kirjaudu sisään",
    errors: {
      generic: "Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.",
      restricted:
        "Rekisteröityminen on rajoitettu. Pyydä ylläpitäjältä pääsyä.",
    },
  },
  athletes: {
    title: "Urheilijat",
    addNew: "Lisää urheilija",
    empty: "Ei urheilijoita. Lisää ensimmäinen.",
    emptyFiltered: "Ei urheilijoita näillä suodattimilla.",
    showArchived: "Näytä arkistoidut",
    activeTab: "Aktiiviset",
    archivedTab: "Arkistoidut",
    searchPlaceholder: "Etsi nimellä…",
    genderFilter: {
      all: "Kaikki",
      male: "Miehet",
      female: "Naiset",
    },
    fields: {
      name: "Nimi",
      photo: "Valokuva",
      gender: "Sukupuoli",
      genderM: "Mies",
      genderW: "Nainen",
      crop: "Rajaus",
      active: "Aktiivinen",
    },
    actions: {
      save: "Tallenna",
      cancel: "Peruuta",
      archive: "Arkistoi",
      restore: "Palauta",
      edit: "Muokkaa",
      delete: "Poista",
      uploadPhoto: "Lataa valokuva",
      adjustCrop: "Säädä rajausta",
    },
    crop: {
      title: "Säädä rajaus",
      hint: "Vedä ja zoomaa kuvaa rajauskehyksen sisällä.",
      reset: "Nollaa",
    },
    deleteDialog: {
      title: "Poista urheilija pysyvästi",
      description: (name: string) =>
        `${name} ja heidän valokuvansa poistetaan pysyvästi. Toimintoa ei voi peruuttaa.`,
      confirm: "Poista lopullisesti",
      blockedTitle: "Urheilijaa ei voi poistaa",
      blockedDescription: (name: string, count: number) =>
        `${name} on mukana ${count} tallennetussa joukkuekuvassa. ` +
        `Pysyvää poistoa ei voi tehdä, koska se muuttaisi noiden ` +
        `kuvien sisältöä. Arkistoi urheilija piilottaaksesi heidät ` +
        `valikoista, tai poista ensin heidät joukkuekuvista (tai ` +
        `poista joukkuekuvat) ennen pysyvää poistoa.`,
      blockedDismiss: "Selvä",
    },
    formNotice: {
      updatesPropagate:
        "Nimen tai kuvan muutokset näkyvät automaattisesti kaikissa " +
        "tallennetuissa joukkuekuvissa.",
    },
  },
  templates: {
    title: "Mallit",
    addNew: "Uusi malli",
    empty: "Ei malleja. Lataa ensimmäinen taustakuva.",
    fields: {
      aspect: "Kuvasuhde",
      name: "Nimi",
      background: "Taustakuva",
    },
    aspects: {
      square: "Neliö (1:1)",
      portrait: "Pystysuora (4:5)",
    },
    actions: {
      save: "Tallenna",
      cancel: "Peruuta",
      edit: "Muokkaa",
      delete: "Poista",
    },
    deleteDialog: {
      title: "Poista malli pysyvästi",
      description: (name: string) =>
        `${name} ja sen taustakuva poistetaan pysyvästi. Toimintoa ei voi peruuttaa.`,
      confirm: "Poista lopullisesti",
    },
    backgroundHint: (w: number, h: number) =>
      `Taustakuvan mittojen pitää olla tarkalleen ${w}×${h} pikseliä.`,
    errors: {
      dimensions: (
        expectedW: number,
        expectedH: number,
        gotW: number,
        gotH: number
      ) =>
        `Taustakuvan mittojen pitää olla ${expectedW}×${expectedH}, sait ${gotW}×${gotH}.`,
      uploadFailed: "Taustakuvan lataus epäonnistui.",
      saveFailed: "Tallennus epäonnistui.",
    },
  },
  teams: {
    title: "Joukkuekuvat",
    new: "Uusi joukkuekuva",
    empty: "Ei tallennettuja joukkuekuvia.",
    emptyFiltered: "Ei joukkuekuvia näillä suodattimilla.",
    filters: {
      searchPlaceholder: "Etsi nimellä, urheilijalla tai tapahtumalla…",
      from: "Alkupäivä",
      to: "Loppupäivä",
      dateRange: "Luontipäivä",
    },
    listingNotice:
      "Tallennetut joukkuekuvat käyttävät urheilijoiden ja mallien " +
      "uusinta tietoa. Lataa kuva uudelleen, jos haluat päivittää " +
      "PNG-tiedoston.",
    fields: {
      layout: "Asettelu",
      name: "Tallenteen nimi",
      template: "Malli",
      roster: "Juoksujärjestys",
    },
    actions: {
      save: "Tallenna",
      saveAndExport: "Tallenna ja vie PNG",
      export: "Vie PNG",
      duplicate: "Kopioi",
      delete: "Poista",
      pickAthlete: "Valitse urheilija",
    },
    errors: {
      rosterIncomplete: (missing: number) =>
        `Lisää vielä ${missing} urheilijaa.`,
    },
    deleteDialog: {
      title: "Poista joukkuekuva pysyvästi",
      description: (name: string) =>
        `${name} poistetaan pysyvästi. Toimintoa ei voi peruuttaa.`,
      confirm: "Poista lopullisesti",
    },
  },
  layouts: {
    relay2: "2-osainen viesti",
    relay3: "3-osainen viesti",
    relay4: "4-osainen viesti (Venla)",
    relay6: "6-osainen viesti",
    relay7: "7-osainen viesti (Jukola)",
    relay10: "10-osainen viesti (Tiomila)",
    relay25: "25-osainen viesti (25-manna)",
  },
  common: {
    loading: "Ladataan…",
    saving: "Tallennetaan…",
    error: "Virhe",
    requiredField: "Pakollinen kenttä",
    done: "Valmis",
  },
} as const

export type Messages = typeof fi
