(function (global) {
  'use strict';

  const VALUE_TYPES = Object.freeze({
    direct: 'direct',
    transformed: 'transformed',
    interpretiveMidpoint: 'interpretive_midpoint',
    userDefined: 'user_defined'
  });

  const SOURCE_LINKS = Object.freeze({
    'Fulton et al. 2017': {
      url: 'https://doi.org/10.3847/1538-3881/aa80eb',
      status: 'verified',
      title: 'The California-Kepler Survey. III. A Gap in the Radius Distribution of Small Planets'
    },
    'Rogers 2015': {
      url: 'https://doi.org/10.1088/0004-637X/801/1/41',
      status: 'verified',
      title: 'Most 1.6 Earth-radius Planets are Not Rocky'
    },
    'Berger et al. 2020': {
      url: 'https://doi.org/10.3847/1538-3881/aba18a',
      status: 'verified',
      title: 'The Gaia-Kepler Stellar Properties Catalog. II. Planet Radius Demographics as a Function of Stellar Mass and Age'
    },
    'Cassan et al. 2012': {
      url: 'https://doi.org/10.1038/nature10684',
      status: 'verified',
      title: 'One or more bound planets per Milky Way star from microlensing observations'
    },
    'Hsu et al. 2019': {
      url: 'https://doi.org/10.3847/1538-3881/ab31ab',
      status: 'verified',
      title: 'Occurrence Rates of Planets Orbiting FGK Stars: Combining Kepler DR25, Gaia DR2, and Bayesian Inference'
    },
    'Owen & Wu 2017': {
      url: 'https://doi.org/10.3847/1538-4357/aa890a',
      status: 'verified',
      title: 'The Evaporation Valley in the Kepler Planets'
    },
    'Foley & Smye 2018': {
      url: 'https://doi.org/10.1089/ast.2017.1695',
      status: 'verified',
      title: 'Carbon Cycling and Habitability of Earth-Sized Stagnant Lid Planets'
    },
    'Tian & Ida 2015': {
      url: 'https://doi.org/10.1038/ngeo2372',
      status: 'verified',
      title: 'Water contents of Earth-mass planets around M dwarfs'
    },
    'Mulders et al. 2015': {
      url: 'https://arxiv.org/abs/1505.03516',
      status: 'verified',
      title: 'The snow line in viscous disks around low-mass stars: implications for water delivery to terrestrial planets in the habitable zone'
    },
    'Tian 2015': {
      url: 'https://doi.org/10.1146/annurev-earth-060313-054834',
      status: 'verified',
      title: 'Atmospheric Escape from Solar System Terrestrial Planets and Exoplanets'
    },
    'Lissauer et al. 2012': {
      url: 'https://doi.org/10.1016/j.icarus.2011.10.013',
      status: 'verified',
      title: 'Obliquity variations of a moonless Earth'
    },
    'Lissauer et al. 2011': {
      url: 'https://ui.adsabs.harvard.edu/abs/2011ApJS..197....8L/abstract',
      status: 'verified',
      title: 'Architecture and Dynamics of Kepler’s Candidate Multiple Transiting Planet Systems'
    },
    'Steffen et al. 2012': {
      url: 'https://doi.org/10.1093/mnras/sts090',
      status: 'verified',
      title: 'Kepler constraints on planets near hot Jupiters'
    },
    'Tamayo et al. 2020': {
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7414196/',
      status: 'verified',
      title: 'Predicting the long-term stability of compact multiplanet systems'
    },
    'Leconte et al. 2015': {
      url: 'https://doi.org/10.1126/science.1258686',
      status: 'verified',
      title: 'Asynchronous rotation of Earth-mass planets in the habitable zone of lower-mass stars'
    },
    'Lineweaver et al. 2004': {
      url: 'https://doi.org/10.1126/science.1092322',
      status: 'verified',
      title: 'The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way'
    },
    'Prantzos 2008': {
      url: 'https://doi.org/10.1007/s11214-007-9236-9',
      status: 'verified',
      title: 'On the Galactic Habitable Zone'
    },
    'Gowanlock et al. 2011': {
      url: 'https://doi.org/10.1089/ast.2010.0555',
      status: 'verified',
      title: 'A Model of Habitability Within the Milky Way Galaxy'
    },
    'Tilley et al. 2019': {
      url: 'https://doi.org/10.1089/ast.2017.1794',
      status: 'verified',
      title: 'Modeling Repeated M-dwarf Flaring at an Earth-like Planet in the Habitable Zone'
    },
    'Rimmer et al. 2018': {
      url: 'https://doi.org/10.1126/sciadv.aar3302',
      status: 'verified',
      title: 'The origin of RNA precursors on exoplanets'
    },
    'Ranjan et al. 2017': {
      url: 'https://doi.org/10.3847/1538-4357/aa773e',
      status: 'verified',
      title: 'UV Surface Environment of Earth-like Planets Orbiting FGKM Stars Through Geological Evolution'
    },
    'Ranjan et al. 2022': {
      url: 'https://doi.org/10.1089/ast.2020.2422',
      status: 'verified',
      title: 'Prebiotic Chemistry and Atmospheric UV Environments'
    },
    'Piran & Jiménez 2014': {
      url: 'https://doi.org/10.1103/PhysRevLett.113.231102',
      status: 'verified',
      title: 'Possible Role of Gamma Ray Bursts on Life Extinction in the Universe'
    },
    'Lingam & Loeb 2019': {
      url: 'https://doi.org/10.1103/RevModPhys.91.021002',
      status: 'verified',
      title: 'Colloquium: Physical constraints for the evolution of life on exoplanets'
    },
    'Gaia DR3 2022': {
      url: 'https://doi.org/10.1051/0004-6361/202243940',
      status: 'verified',
      title: 'Gaia Data Release 3: Summary of the content and survey properties'
    },
    'Gaia DR3 2022/2023': {
      url: 'https://doi.org/10.1051/0004-6361/202243940',
      status: 'verified',
      title: 'Gaia Data Release 3: Summary of the content and survey properties'
    },
    'Dressing & Charbonneau 2015': {
      url: 'https://doi.org/10.1088/0004-637X/807/1/45',
      status: 'verified',
      title: 'The Occurrence of Potentially Habitable Planets Orbiting M Dwarfs Estimated from the Full Kepler Dataset and an Empirical Measurement of the Detection Sensitivity'
    },
    'Bryson et al. 2021': {
      url: 'https://doi.org/10.3847/1538-3881/abc418',
      status: 'verified',
      title: 'The Occurrence of Rocky Habitable-zone Planets around Solar-like Stars from Kepler Data'
    },
    'Kopparapu et al. 2013': {
      url: 'https://doi.org/10.1088/0004-637X/765/2/131',
      status: 'verified',
      title: 'Habitable Zones around Main-sequence Stars: New Estimates'
    },
    'Henry 2006': {
      url: 'https://doi.org/10.1086/508233',
      status: 'verified',
      title: 'The Solar Neighborhood. XVII. Parallax Results from the CTIOPI 0.9 m Program: 20 New Members of the RECONS 10 Parsec Sample'
    },
    'Shields et al. 2016': {
      url: 'https://doi.org/10.1016/j.physrep.2016.10.003',
      status: 'verified',
      title: 'The habitability of planets orbiting M-dwarf stars'
    },
    'Raymond et al. 2004': {
      url: 'https://doi.org/10.1016/j.icarus.2003.11.019',
      status: 'verified',
      title: 'Making other earths: dynamical simulations of terrestrial planet formation and water delivery'
    },
    'Korenaga 2010': {
      url: 'https://doi.org/10.1088/2041-8205/725/1/L43',
      status: 'verified',
      title: 'On the likelihood of plate tectonics on super-Earths: does size matter?'
    },
    'Noack & Breuer 2014': {
      url: 'https://doi.org/10.1016/j.pss.2013.06.020',
      status: 'verified',
      title: 'Plate tectonics on rocky exoplanets: influence of initial conditions and mantle rheology'
    },
    'Barnes 2017': {
      url: 'https://doi.org/10.1007/s10569-017-9783-7',
      status: 'verified',
      title: 'Tidal locking of habitable exoplanets'
    },
    'Segura et al. 2010': {
      url: 'https://doi.org/10.1089/ast.2009.0376',
      status: 'verified',
      title: 'The effect of a strong stellar flare on the atmospheric chemistry of an Earth-like planet orbiting an M dwarf'
    },
    'Raghavan et al. 2010': {
      url: 'https://doi.org/10.1088/0067-0049/190/1/1',
      status: 'verified',
      title: 'A survey of stellar families: multiplicity of solar-type stars'
    },
    'Eggl et al. 2012': {
      url: 'https://ui.adsabs.harvard.edu/abs/2012ApJ...752...74E/abstract',
      status: 'verified',
      title: 'An analytic method to determine habitable zones for S-type planetary orbits in binary star systems'
    },
    'Ribas et al. 2005': {
      url: 'https://doi.org/10.1086/427977',
      status: 'verified',
      title: 'Evolution of the solar activity over time and effects on planetary atmospheres. I. High-energy irradiances (1-1700 Å)'
    },
    'Van Looveren et al. 2025': {
      url: 'https://doi.org/10.1051/0004-6361/202452998',
      status: 'verified',
      title: 'Habitable zone and atmosphere retention distance for M-dwarf planets'
    },
    'Zuluaga et al. 2013': {
      url: 'https://doi.org/10.1088/0004-637X/770/1/23',
      status: 'verified',
      title: 'The Influence of Thermal Evolution in the Magnetic Protection of Terrestrial Planets'
    },
    'Driscoll & Bercovici 2014': {
      url: 'https://doi.org/10.1016/j.pepi.2014.08.004',
      status: 'verified',
      title: 'On the thermal and magnetic histories of Earth and Venus: Influences of melting, radioactivity, and conductivity'
    },
    'Matteucci 2012': {
      url: 'https://doi.org/10.1007/978-3-642-22491-1',
      status: 'verified',
      title: 'Chemical Evolution of Galaxies'
    },
    'Laskar et al. 1993': {
      url: 'https://doi.org/10.1038/361615a0',
      status: 'verified',
      title: 'Stabilization of the Earth’s obliquity by the Moon'
    },
    'Cuk & Stewart 2012': {
      url: 'https://doi.org/10.1126/science.1225542',
      status: 'verified',
      title: 'Making the Moon from a Fast-Spinning Earth: A Giant Impact Followed by Resonant Despinning (Moon-formation context, not the obliquity-stabilization mechanism)'
    },
    'Edson et al. 2011': {
      url: 'https://doi.org/10.1016/j.icarus.2010.11.023',
      status: 'verified',
      title: 'Atmospheric circulations of terrestrial planets orbiting low-mass stars'
    },
    'Way & Del Genio 2020': {
      url: 'https://doi.org/10.1029/2019JE006276',
      status: 'verified',
      title: 'Venusian Habitable Climate Scenarios: Modeling Venus Through Time and Applications to Slowly Rotating Venus-Like Exoplanets'
    },
    'Linsenmeier et al. 2015': {
      url: 'https://doi.org/10.1016/j.pss.2014.11.003',
      status: 'verified',
      title: 'Climate of Earth-like planets with high obliquity and eccentric orbits: Implications for habitability conditions'
    },
    'Krijt et al. 2022': {
      url: 'https://arxiv.org/abs/2203.10056',
      status: 'verified',
      title: 'Chemical Habitability: Supply and Retention of Life\'s Essential Elements During Planet Formation'
    },
    'Hinkel et al. 2020': {
      url: 'https://doi.org/10.3847/2041-8213/abb3cb',
      status: 'verified',
      title: 'The Influence of Stellar Phosphorus on Our Understanding of Exoplanets and Astrobiology'
    },
    'Sandberg et al. 2018': {
      url: 'https://arxiv.org/abs/1806.02404',
      status: 'verified',
      title: 'Dissolving the Fermi Paradox'
    },
    'Kipping 2020': {
      url: 'https://doi.org/10.1073/pnas.1921655117',
      status: 'verified',
      title: 'An objective Bayesian analysis of life’s early start and our late arrival'
    }
  });

  const SCIENTIFIC_PARAMETER_ORDER = Object.freeze([
    'N_GHZ',
    'f_sun_type',
    'f_sun_age',
    'N_p_star',
    'f_composition',
    'f_orbit',
    'f_stability',
    'f_magnetosphere',
    'f_lunar_stability',
    'f_size',
    'f_rotation',
    'f_tilt',
    'f_H2O',
    'f_CHNOPS',
    'f_complex_life',
    'f_x'
  ]);

  const SCIENTIFIC_PARAMETERS = Object.freeze({
    N_GHZ: {
      key: 'N_GHZ',
      label: 'Stars in the Galactic Habitable Zone',
      description: 'Literature-informed star-count prior for the Galactic Habitable Zone used by the base model.',
      central: 10000000000,
      min: 5000000000,
      max: 40000000000,
      unit: 'stars',
      citationShort: 'Lineweaver et al. 2004',
      sourceTitle: 'The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way',
      doiOrUrl: 'https://doi.org/10.1126/science.1092322',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Lineweaver anchors the GHZ and age framing but does not directly quote this star count. The registry uses 5e9 as a strict lower-bound prior, 1e10 as the balanced conservative default, and 4e10 as an upper Lineweaver-style prior.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_sun_type: {
      key: 'f_sun_type',
      label: 'Sun-like star fraction',
      description: 'Fraction of stars treated as Sun-like hosts in the base model.',
      central: 0.08,
      min: 0.07,
      max: 0.20,
      unit: 'fraction',
      citationShort: 'Henry 2006; Gaia DR3 2022/2023',
      sourceTitle: 'The Solar Neighborhood. XVII. Parallax Results from the CTIOPI 0.9 m Program: 20 New Members of the RECONS 10 Parsec Sample; Gaia stellar census context',
      doiOrUrl: 'https://doi.org/10.1086/508233',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'The displayed interval is an interpretive host-star range rather than one single point estimate from one table.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_sun_age: {
      key: 'f_sun_age',
      label: 'Old enough stars',
      description: 'Fraction of relevant stars old enough for long biological evolution.',
      central: 0.75,
      min: 0.60,
      max: 0.80,
      unit: 'fraction',
      citationShort: 'Lineweaver et al. 2004',
      sourceTitle: 'The Galactic Habitable Zone and the Age Distribution of Complex Life in the Milky Way',
      doiOrUrl: 'https://doi.org/10.1126/science.1092322',
      exactLocation: null,
      valueType: VALUE_TYPES.direct,
      uncertaintyNote: 'The central value follows the Lineweaver age/GHZ framing; the min/max range is a conservative calculator interval.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    N_p_star: {
      key: 'N_p_star',
      label: 'Planets per star',
      description: 'Average number of planets per star used before applying habitability filters.',
      central: 1.5,
      min: 1.0,
      max: 2.5,
      unit: 'planets_per_star',
      citationShort: 'Cassan 2012; Hsu 2019',
      sourceTitle: 'One or more bound planets per Milky Way star from microlensing observations; Occurrence Rates of Planets Orbiting FGK Stars',
      doiOrUrl: 'https://doi.org/10.1038/nature10684',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'This range combines broad planet-occurrence context with Kepler/Gaia-era occurrence constraints.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_composition: {
      key: 'f_composition',
      label: 'Rocky planet fraction',
      description: 'Fraction of planets treated as compositionally rocky in the base model.',
      central: 0.20,
      min: 0.15,
      max: 0.35,
      unit: 'fraction',
      citationShort: 'Dressing 2015; Rogers 2015',
      sourceTitle: 'The Occurrence of Potentially Habitable Planets Orbiting M Dwarfs; Most 1.6 Earth-radius Planets are Not Rocky',
      doiOrUrl: 'https://doi.org/10.1088/0004-637X/807/1/45',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'The base fraction is a model split of rocky composition separate from size and habitable-zone filters.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_orbit: {
      key: 'f_orbit',
      label: 'Habitable-zone orbit fraction',
      description: 'Fraction of rocky planets assigned to the habitable-zone orbital filter.',
      central: 0.18,
      min: 0.10,
      max: 0.21,
      unit: 'fraction',
      citationShort: 'Bryson et al. 2021; Kopparapu et al. 2013',
      sourceTitle: 'The Occurrence of Rocky Habitable-zone Planets around Solar-like Stars from Kepler Data; Habitable Zones around Main-sequence Stars: New Estimates',
      doiOrUrl: 'https://doi.org/10.3847/1538-3881/abc418',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Bryson et al. 2021 supports rocky habitable-zone occurrence estimates from Kepler DR25 and Gaia-based stellar properties. Kopparapu et al. 2013 supports habitable-zone boundary calculations. The displayed f_orbit value is a model factor in this calculator, not a directly quoted single-paper probability.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_stability: {
      key: 'f_stability',
      label: 'Orbital stability fraction',
      description: 'Fraction of systems treated as having long-term stable planetary orbits.',
      central: 0.50,
      min: 0.30,
      max: 0.70,
      unit: 'fraction',
      citationShort: 'Lissauer et al. 2011; Steffen et al. 2012',
      sourceTitle: 'Kepler multiplanet architecture and orbital-stability context',
      doiOrUrl: 'https://ui.adsabs.harvard.edu/abs/2011ApJS..197....8L/abstract',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Long-term orbital stability is a necessary dynamical condition, but the displayed 0.30-0.70 interval is a mechanism-supported model range, not a directly measured universal occurrence fraction. Zink and Hansen 2019 remains multiplicity/eta-Earth context rather than the main stability source.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_magnetosphere: {
      key: 'f_magnetosphere',
      label: 'Magnetosphere retention fraction',
      description: 'Fraction of planets treated as retaining magnetic/atmospheric protection relevant to long-term habitability.',
      central: 0.50,
      min: 0.20,
      max: 0.70,
      unit: 'fraction',
      citationShort: 'Zuluaga 2013',
      sourceTitle: 'The Influence of Thermal Evolution in the Magnetic Protection of Terrestrial Planets',
      doiOrUrl: 'https://doi.org/10.1088/0004-637X/770/1/23',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Zuluaga 2013 supports magnetic shielding as a relevant habitability mechanism; the displayed 0.20–0.70 range is a model prior rather than a directly measured occurrence fraction.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_lunar_stability: {
      key: 'f_lunar_stability',
      label: 'Lunar or equivalent stabilizer fraction',
      description: 'Fraction of planets assigned a large moon or equivalent stabilizing mechanism.',
      central: 0.70,
      min: 0.40,
      max: 0.90,
      unit: 'fraction',
      citationShort: 'Lissauer 2012; Laskar 1993',
      sourceTitle: 'Obliquity variations of a moonless Earth; stabilization of the Earth’s obliquity by the Moon',
      doiOrUrl: 'https://doi.org/10.1016/j.icarus.2011.10.013',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Lissauer 2012 weakens the strict large-Moon requirement by showing that moonless Earth-like obliquity evolution need not be immediately catastrophic, while Laskar 1993 remains the stabilizing-moon contrast case. The displayed 0.40–0.90 range is not a measured moon-occurrence frequency.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_size: {
      key: 'f_size',
      label: 'Suitable planet size fraction',
      description: 'Fraction of planets retained by the Earth-like size/radius filter.',
      central: 0.50,
      min: 0.30,
      max: 0.65,
      unit: 'fraction',
      citationShort: 'Rogers 2015; Fulton 2017',
      sourceTitle: 'Most 1.6 Earth-radius Planets are Not Rocky; The California-Kepler Survey III',
      doiOrUrl: 'https://doi.org/10.1088/0004-637X/801/1/41',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Literature-informed range. Rogers 2015 and Fulton 2017 anchor the rocky/non-rocky transition and radius-valley context; the displayed 0.30–0.65 is an interpretive midpoint rather than a directly quoted occurrence value.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_rotation: {
      key: 'f_rotation',
      label: 'Suitable rotation fraction',
      description: 'Fraction of planets with rotation states treated as favorable for climate and dynamo suitability.',
      central: 0.27,
      min: 0.15,
      max: 0.35,
      unit: 'fraction',
      citationShort: 'Edson 2011; Way & Del Genio 2020',
      sourceTitle: 'Atmospheric circulations of terrestrial planets orbiting low-mass stars; Venusian habitable climate scenarios for slow rotators',
      doiOrUrl: 'https://doi.org/10.1016/j.icarus.2010.11.023',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Edson 2011 and Way & Del Genio 2020 frame how rotation affects atmospheric circulation and climate regime; the displayed 0.15–0.35 range is not a directly measured occurrence rate.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_tilt: {
      key: 'f_tilt',
      label: 'Favorable axial tilt fraction',
      description: 'Fraction of planets assigned an axial tilt state favorable to long-term surface habitability.',
      central: 0.60,
      min: 0.40,
      max: 0.85,
      unit: 'fraction',
      citationShort: 'Lissauer 2012; Linsenmeier 2015',
      sourceTitle: 'Obliquity variations of a moonless Earth; climate of Earth-like planets with high obliquity and eccentric orbits',
      doiOrUrl: 'https://doi.org/10.1016/j.icarus.2011.10.013',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Lissauer 2012 makes the obliquity filter less restrictive than a simple large-Moon requirement, while Linsenmeier 2015 supports high-obliquity climate context. The displayed 0.40–0.85 range is an interpretive model prior, not a directly measured universal frequency.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_H2O: {
      key: 'f_H2O',
      label: 'Surface liquid water fraction',
      description: 'Fraction of otherwise suitable planets that pass the liquid-water availability filter.',
      central: 0.30,
      min: 0.10,
      max: 0.80,
      unit: 'fraction',
      citationShort: 'Tian & Ida 2015; Mulders 2015',
      sourceTitle: 'Water contents of Earth-mass planets around M dwarfs; snow-line implications for water delivery to terrestrial planets in the habitable zone',
      doiOrUrl: 'https://doi.org/10.1038/ngeo2372',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Tian & Ida 2015 and Mulders 2015 are closer to the intended water-availability fraction than a generic volatile-delivery mechanism, but the displayed 0.10–0.80 range remains a model prior rather than a measured frequency of stable surface oceans.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_CHNOPS: {
      key: 'f_CHNOPS',
      label: 'CHNOPS availability fraction',
      description: 'Fraction of planets assigned sufficient availability of key biogenic elements.',
      central: 0.10,
      min: 0.05,
      max: 0.50,
      unit: 'fraction',
      citationShort: 'Krijt et al. 2022; Hinkel et al. 2020',
      sourceTitle: 'Chemical habitability and supply/retention of CHNOPS during planet formation; stellar phosphorus as an exoplanet habitability constraint',
      doiOrUrl: 'https://arxiv.org/abs/2203.10056',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'Mechanism-supported model prior. Krijt et al. 2022 targets chemical habitability and CHNOPS supply/retention during planet formation more directly than solar-abundance tables; Hinkel et al. 2020 highlights phosphorus as a limiting uncertainty. The displayed 0.05–0.50 range remains a model prior, not a measured CHNOPS availability fraction.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_complex_life: {
      key: 'f_complex_life',
      label: 'Complex-life prior',
      description: 'Conditional prior for complex life emerging on an otherwise habitable planet when the complex-life gate is enabled.',
      central: 0.01,
      min: 0.000000001,
      max: 1.0,
      unit: 'fraction',
      citationShort: 'Sandberg et al. 2018; Kipping 2020',
      sourceTitle: 'Dissolving the Fermi Paradox; Bayesian uncertainty around life and intelligence',
      doiOrUrl: 'https://arxiv.org/abs/1806.02404',
      exactLocation: null,
      valueType: VALUE_TYPES.interpretiveMidpoint,
      uncertaintyNote: 'This broad range is a speculative model prior for biological filters; it is not an empirically calibrated probability of complex life.',
      isLiteratureBacked: true,
      needsCitationPrecision: true
    },
    f_x: {
      key: 'f_x',
      label: 'Wildcard factor',
      description: 'User-defined catch-all factor for unknown filters not represented elsewhere in the model.',
      central: 1,
      min: 0.5,
      max: 1.0,
      unit: 'fraction',
      citationShort: 'User defined',
      sourceTitle: null,
      doiOrUrl: null,
      exactLocation: null,
      valueType: VALUE_TYPES.userDefined,
      uncertaintyNote: 'This parameter is intentionally outside literature-backed preset claims and should not be cited as a published value.',
      isLiteratureBacked: false,
      needsCitationPrecision: false
    }
  });

  const SCIENTIFIC_PRESETS = Object.freeze({
    pessimist: {
      label: 'Pessimist - Rare Earth Stress Test',
      source: 'Rare Earth / Hart 1975 / Hanson 1998',
      description: 'Illustrative restrictive stress-test; the numeric chain is not a Hart point-estimate table.',
      values: Object.freeze({
        N_GHZ: 5000000000,
        f_sun_type: 0.07,
        f_sun_age: 0.60,
        N_p_star: 1.0,
        f_composition: 0.15,
        f_orbit: 0.10,
        f_stability: 0.30,
        f_magnetosphere: 0.20,
        f_lunar_stability: 0.40,
        f_size: 0.30,
        f_rotation: 0.15,
        f_tilt: 0.40,
        f_H2O: 0.10,
        f_CHNOPS: 0.05,
        f_complex_life: 0.000001,
        f_x: 1
      }),
      enableComplex: true,
      enableX: false
    },
    consensus: {
      label: 'Consensus - Lineweaver',
      source: 'Lineweaver 2004',
      description: 'Lineweaver anchors the GHZ and age terms; N_GHZ is a balanced conservative GHZ star-count prior and remaining factors are separate literature midpoints.',
      values: Object.freeze({
        N_GHZ: 10000000000,
        f_sun_type: 0.08,
        f_sun_age: 0.75,
        N_p_star: 1.5,
        f_composition: 0.20,
        f_orbit: 0.18,
        f_stability: 0.50,
        f_magnetosphere: 0.50,
        f_lunar_stability: 0.70,
        f_size: 0.50,
        f_rotation: 0.27,
        f_tilt: 0.60,
        f_H2O: 0.30,
        f_CHNOPS: 0.10,
        f_complex_life: 0.01,
        f_x: 1
      }),
      enableComplex: false,
      enableX: false
    },
    optimist: {
      label: 'High-End - Literature Bounds',
      source: 'Illustrative upper-range stress test',
      description: 'High-end values drawn from the upper side of displayed literature-informed ranges.',
      values: Object.freeze({
        N_GHZ: 40000000000,
        f_sun_type: 0.20,
        f_sun_age: 0.75,
        N_p_star: 2.0,
        f_composition: 0.35,
        f_orbit: 0.21,
        f_stability: 0.70,
        f_magnetosphere: 0.70,
        f_lunar_stability: 0.90,
        f_size: 0.65,
        f_rotation: 0.35,
        f_tilt: 0.85,
        f_H2O: 0.80,
        f_CHNOPS: 0.50,
        f_complex_life: 1.0,
        f_x: 1
      }),
      enableComplex: true,
      enableX: false
    },
    kepler: {
      label: 'Kepler/Gaia - Bryson',
      source: 'Bryson et al. 2021',
      description: 'Kepler DR25 plus Gaia-era occurrence-rate update; split into factors is a model approximation and N_GHZ remains the balanced Lineweaver-informed GHZ prior.',
      values: Object.freeze({
        N_GHZ: 10000000000,
        f_sun_type: 0.08,
        f_sun_age: 0.75,
        N_p_star: 1.6,
        f_composition: 0.25,
        f_orbit: 0.21,
        f_stability: 0.50,
        f_magnetosphere: 0.50,
        f_lunar_stability: 0.70,
        f_size: 0.55,
        f_rotation: 0.27,
        f_tilt: 0.60,
        f_H2O: 0.30,
        f_CHNOPS: 0.15,
        f_complex_life: 0.01,
        f_x: 1
      }),
      enableComplex: false,
      enableX: false
    }
  });

  const SCIENTIFIC_OBSERVATIONAL_PRIORS = Object.freeze({
    pre: Object.freeze({
      label: 'Pre-2021 literature values',
      values: Object.freeze({
        f_orbit: 0.18,
        f_composition: 0.20
      }),
      note: 'Conservative Kepler-era literature values for f_HZ and f_rocky.'
    }),
    post: Object.freeze({
      label: 'Kepler/Gaia occurrence priors',
      values: Object.freeze({
        f_orbit: 0.21,
        f_composition: 0.25
      }),
      note: 'Updated Kepler/Gaia occurrence priors for f_HZ and f_rocky; not an atmospheric-spectroscopy occurrence-rate measurement.'
    })
  });

  const SCIENTIFIC_PARAMETER_REGISTRY = Object.freeze({
    version: '1.0.0',
    calculatorVersion: '2.16',
    parameterOrder: SCIENTIFIC_PARAMETER_ORDER,
    parameters: SCIENTIFIC_PARAMETERS,
    presets: SCIENTIFIC_PRESETS,
    observationalPriors: SCIENTIFIC_OBSERVATIONAL_PRIORS,
    sourceLinks: SOURCE_LINKS,
    valueTypes: VALUE_TYPES
  });

  global.SCIENTIFIC_PARAMETER_REGISTRY = SCIENTIFIC_PARAMETER_REGISTRY;
  global.SCIENTIFIC_PARAMETERS = SCIENTIFIC_PARAMETERS;
  global.SOURCE_LINKS = SOURCE_LINKS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SCIENTIFIC_PARAMETER_REGISTRY,
      SCIENTIFIC_PARAMETERS,
      SCIENTIFIC_PARAMETER_ORDER,
      SCIENTIFIC_PRESETS,
      SCIENTIFIC_OBSERVATIONAL_PRIORS,
      SOURCE_LINKS,
      VALUE_TYPES
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
