export const fi = {
   app: {
      name: "JKG",
      tagline: "Suunnistusviestien joukkuekuvat Instagramia varten",
   },
   landing: {
      headline: "Tee viestijoukkueen Instagram-kuvat hetkessä.",
      subhead:
         "Lataa urheilijoiden kuvat kerran, valitse malli ja tuota julkaisukelpoiset joukkuekuvat suunnistusviesteihin.",
      primaryCta: "Aloita",
      secondaryCta: "Kirjaudu sisään",
   },
   nav: {
      teams: "Joukkuekuvat",
      athletes: "Urheilijat",
      templates: "Mallit",
      signOut: "Kirjaudu ulos",
      menu: "Valikko",
   },
   dashboard: {
      title: "Joukkuekuvageneraattori",
      sections: {
         teams: {
            title: "Joukkuekuvat",
            description: "Selaa aiemmin tehtyjä julkaisuja.",
            action: "Uusi joukkuekuva",
            view: "Avaa joukkuekuvat",
         },
         athletes: {
            title: "Urheilijat",
            description: "Hallinnoi urheilijoiden kuvia ja tietoja.",
            action: "Lisää urheilija",
            view: "Avaa urheilijat",
         },
         templates: {
            title: "Mallit",
            description: "Luo ja muokkaa kuvamalleja.",
            action: "Uusi malli",
            view: "Avaa mallit",
         },
      },
   },
   theme: {
      toggle: "Vaihda teema",
   },
   userMenu: {
      label: "Käyttäjävalikko",
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
         invalidEmail: "Anna kelvollinen sähköpostiosoite.",
         passwordTooShort: "Salasanan tulee olla vähintään 8 merkkiä.",
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
         nickname: "Lempinimi",
         nicknameHint:
            'Esim. "Pleku". Auttaa AI-avustajaa tunnistamaan urheilijan, kun rosteri kirjoitetaan lempinimillä.',
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
            gotH: number,
         ) =>
            `Taustakuvan mittojen pitää olla ${expectedW}×${expectedH}, sait ${gotW}×${gotH}.`,
         uploadFailed: "Taustakuvan lataus epäonnistui.",
         saveFailed: "Tallennus epäonnistui.",
      },
   },
   teams: {
      title: "Joukkuekuvat",
      new: "Uusi joukkuekuva",
      createWithAi: "Luo tekoälyllä",
      aiAssist: {
         title: "Luo joukkuekuva tekoälyllä",
         description:
            "Liitä kuvaus joukkueesta: tapahtuma, joukkueen nimi ja juoksijat. " +
            "Tekoäly poimii tiedot ja avaa lomakkeen valmiiksi täytettynä.",
         placeholder:
            'Esim. "Angelniemen Ankkuri 1, Kotka-Jukola 2026: Nico, Guilhem, Ondra, ' +
            'Mäksä, Bastien, Onni, Colin"',
         submit: "Luo ehdotus",
         thinking: "Mietitään…",
         correcting: "Korjataan…",
         planTitle: "Tekoälyn ehdotus",
         planLayout: "Asettelu",
         planEvent: "Tapahtuma",
         planTeam: "Joukkue",
         planMatched: "Olemassa olevat",
         planAmbiguous: "Tarkista nämä",
         planAmbiguousHint:
            "Valitse oikea urheilija tai luo uusi. Jokainen on valittava ennen kuin voit jatkaa.",
         planNew: "Luodaan uudet",
         planNewHint:
            "Nämä urheilijat luodaan ilman valokuvaa. Voit lisätä kuvan myöhemmin urheilijasivulta.",
         pickNew: "+ Luo uusi",
         ok: "OK, jatka lomakkeelle",
         reset: "Aloita alusta",
         clarifyPlaceholder: "Kirjoita vastaus tai jätä tyhjäksi ja ohita",
         clarifySubmit: "Vastaa",
         skip: "Ohita",
         correctionPlaceholder:
            'Korjaa tarvittaessa, esim. "Heksa = Heikki Tervo"',
         correctionSubmit: "Korjaa",
         errors: {
            empty: "Kirjoita ensin viesti.",
            rateLimit: "Liian monta pyyntöä. Yritä uudelleen hetken päästä.",
            invalid:
               "Tekoäly antoi epäselvän vastauksen. Yritä uudelleen tai muotoile viesti tarkemmin.",
            generic: "AI-pyyntö epäonnistui.",
            notConfigured: "Tekoäly ei ole vielä konfiguroitu.",
            unresolvedAmbiguous:
               'Valitse jokaiselle epäselvälle nimelle joko olemassa oleva urheilija tai "+ Luo uusi".',
            creationFailed: "Urheilijoiden luonti epäonnistui.",
         },
      },
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
         templateRequired: "Valitse malli.",
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
} as const;

export type Messages = typeof fi;
