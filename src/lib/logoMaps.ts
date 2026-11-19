/**
 * Curated team logos: instant, no network. Keys are matched exactly after
 * teamKey() normalisation (lower case, no accents, single spaces), never by
 * substring, so "Celtic" can't swallow "Boston Celtics".
 */

// ----- Football ----------------------------------------------------------------
// Wikimedia thumbnails. If one breaks, TeamLogo reports it and the online
// search takes over for that team.
export const FOOTBALL_LOGOS: Record<string, string> = {
  // ----- TOP 20 KLUBÓW EUROPEJSKICH -----
  "real madrid": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/120px-Real_Madrid_CF.svg.png",
  "real madrid cf": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/120px-Real_Madrid_CF.svg.png",
  "fc barcelona": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "barcelona": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "barca": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "manchester united": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/120px-Manchester_United_FC_crest.svg.png",
  "man utd": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/120px-Manchester_United_FC_crest.svg.png",
  "manchester city": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/120px-Manchester_City_FC_badge.svg.png",
  "man city": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/120px-Manchester_City_FC_badge.svg.png",
  "bayern munich": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "bayern munchen": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "fc bayern": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "liverpool": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/120px-Liverpool_FC.svg.png",
  "liverpool fc": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/120px-Liverpool_FC.svg.png",
  "chelsea": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Chelsea_FC.svg/120px-Chelsea_FC.svg.png",
  "chelsea fc": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Chelsea_FC.svg/120px-Chelsea_FC.svg.png",
  "arsenal": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/120px-Arsenal_FC.svg.png",
  "arsenal fc": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/120px-Arsenal_FC.svg.png",
  "juventus": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Juventus_FC_2017_logo.svg/120px-Juventus_FC_2017_logo.svg.png",
  "inter milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/FC_Internazionale_Milano_2014_logo.svg/120px-FC_Internazionale_Milano_2014_logo.svg.png",
  "inter": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/FC_Internazionale_Milano_2014_logo.svg/120px-FC_Internazionale_Milano_2014_logo.svg.png",
  "ac milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/120px-Logo_of_AC_Milan.svg.png",
  "milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/120px-Logo_of_AC_Milan.svg.png",
  "paris saint germain": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "paris saint-germain": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "psg": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "tottenham hotspur": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "tottenham": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "spurs": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "borussia dortmund": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "dortmund": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "bvb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "atletico madrid": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Atletico_de_Madrid_logo.svg/120px-Atletico_de_Madrid_logo.svg.png",
  "sevilla": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Sevilla_FC_logo.svg/120px-Sevilla_FC_logo.svg.png",
  "valencia": "https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Valencia_CF_logo.svg/120px-Valencia_CF_logo.svg.png",
  "lyon": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Olympique_Lyonnais.svg/120px-Olympique_Lyonnais.svg.png",
  "olympique lyonnais": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Olympique_Lyonnais.svg/120px-Olympique_Lyonnais.svg.png",
  "marseille": "https://upload.wikimedia.org/wikipedia/en/thumb/1/14/Olympique_de_Marseille_logo.svg/120px-Olympique_de_Marseille_logo.svg.png",
  "napoli": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/SSC_Napoli.svg/120px-SSC_Napoli.svg.png",
  "ssc napoli": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/SSC_Napoli.svg/120px-SSC_Napoli.svg.png",
  "as roma": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/AS_Roma.svg/120px-AS_Roma.svg.png",
  "roma": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/AS_Roma.svg/120px-AS_Roma.svg.png",
  "lazio": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/SS_Lazio_logo.svg/120px-SS_Lazio_logo.svg.png",
  "ss lazio": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/SS_Lazio_logo.svg/120px-SS_Lazio_logo.svg.png",
  "ajax": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/120px-Ajax_Amsterdam.svg.png",
  "afc ajax": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/120px-Ajax_Amsterdam.svg.png",
  "benfica": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SL_Benfica_logo.svg/120px-SL_Benfica_logo.svg.png",
  "sl benfica": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SL_Benfica_logo.svg/120px-SL_Benfica_logo.svg.png",
  "porto": "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/FC_Porto.svg/120px-FC_Porto.svg.png",
  "fc porto": "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/FC_Porto.svg/120px-FC_Porto.svg.png",
  "celtic": "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Celtic_FC.svg/120px-Celtic_FC.svg.png",
  "rangers": "https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Rangers_F.C._logo.svg/120px-Rangers_F.C._logo.svg.png",
  "galatasaray": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Galatasaray_SK_Logo.svg/120px-Galatasaray_SK_Logo.svg.png",
  "fenerbahce": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/Fenerbahce_SK_Logo.svg/120px-Fenerbahce_SK_Logo.svg.png",

  // ----- DODATKOWE KLUBY Z TOP LIG -----
  "villarreal": "https://upload.wikimedia.org/wikipedia/en/thumb/7/72/Villarreal_CF_logo.svg/120px-Villarreal_CF_logo.svg.png",
  "athletic bilbao": "https://upload.wikimedia.org/wikipedia/en/thumb/3/36/Atletic_Bilbao_crest.svg/120px-Atletic_Bilbao_crest.svg.png",
  "real sociedad": "https://upload.wikimedia.org/wikipedia/en/thumb/3/39/Real_Sociedad_crest.svg/120px-Real_Sociedad_crest.svg.png",
  "real betis": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Real_Betis_logo.svg/120px-Real_Betis_logo.svg.png",
  "celta vigo": "https://upload.wikimedia.org/wikipedia/en/thumb/6/63/Real_Celta_de_Vigo_logo.svg/120px-Real_Celta_de_Vigo_logo.svg.png",
  "espanyol": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/RCD_Espanyol_crest.svg/120px-RCD_Espanyol_crest.svg.png",
  "granada": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/Granada_CF_logo.svg/120px-Granada_CF_logo.svg.png",
  "osasuna": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/CA_Osasuna_logo.svg/120px-CA_Osasuna_logo.svg.png",
  "alaves": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Deportivo_Alaves_logo.svg/120px-Deportivo_Alaves_logo.svg.png",
  "valladolid": "https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Real_Valladolid_CF_logo.svg/120px-Real_Valladolid_CF_logo.svg.png",

  "monaco": "https://upload.wikimedia.org/wikipedia/en/thumb/4/48/AS_Monaco_logo.svg/120px-AS_Monaco_logo.svg.png",
  "as monaco": "https://upload.wikimedia.org/wikipedia/en/thumb/4/48/AS_Monaco_logo.svg/120px-AS_Monaco_logo.svg.png",
  "rennes": "https://upload.wikimedia.org/wikipedia/en/thumb/2/25/Stade_Rennais_FC.svg/120px-Stade_Rennais_FC.svg.png",
  "lille": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bd/LOSC_Lille_logo.svg/120px-LOSC_Lille_logo.svg.png",
  "leicester city": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2d/Leicester_City_crest.svg/120px-Leicester_City_crest.svg.png",
  "leeds united": "https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Leeds_United.svg/120px-Leeds_United.svg.png",
  "southampton": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c9/Southampton_F.C.svg/120px-Southampton_F.C.svg.png",
  "newcastle united": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Newcastle_United_Logo.svg/120px-Newcastle_United_Logo.svg.png",
  "brighton": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fd/Brighton_%26_Hove_Albion_logo.svg/120px-Brighton_%26_Hove_Albion_logo.svg.png",
  "aston villa": "https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Aston_Villa_crest.svg/120px-Aston_Villa_crest.svg.png",
  "everton": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Everton_FC.svg/120px-Everton_FC.svg.png",
  "west ham": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/West_Ham_United_FC_logo.svg/120px-West_Ham_United_FC_logo.svg.png",
  "crystal palace": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Crystal_Palace_FC_logo.svg/120px-Crystal_Palace_FC_logo.svg.png",
  "fulham": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/Fulham_FC_2018.svg/120px-Fulham_FC_2018.svg.png",
  "wolves": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fd/Wolverhampton_Wanderers.svg/120px-Wolverhampton_Wanderers.svg.png",
  "burnley": "https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Burnley_FC_crest.svg/120px-Burnley_FC_crest.svg.png",
  "watford": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Watford.svg/120px-Watford.svg.png",
  "nottingham forest": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Nottingham_Forest_FC_logo.svg/120px-Nottingham_Forest_FC_logo.svg.png",
  "sheffield united": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Sheffield_United.svg/120px-Sheffield_United.svg.png",

  "bayer leverkusen": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Bayer_04_Leverkusen_Logo.svg/120px-Bayer_04_Leverkusen_Logo.svg.png",
  "rb leipzig": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/RB_Leipzig_2014_logo.svg/120px-RB_Leipzig_2014_logo.svg.png",
  "eintracht frankfurt": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Eintracht_Frankfurt_Logo.svg/120px-Eintracht_Frankfurt_Logo.svg.png",
  "freiburg": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/SC_Freiburg.svg/120px-SC_Freiburg.svg.png",
  "mainz": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/FSV_Mainz_05.svg/120px-FSV_Mainz_05.svg.png",
  "cologne": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/1FC_Koeln.svg/120px-1FC_Koeln.svg.png",
  "schalke 04": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/FC_Schalke_04_Logo.svg/120px-FC_Schalke_04_Logo.svg.png",
  "stuttgart": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/VfB_Stuttgart_Logo_2014.svg/120px-VfB_Stuttgart_Logo_2014.svg.png",
  "hamburg": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Hamburger_SV.svg/120px-Hamburger_SV.svg.png",
  "hertha berlin": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Hertha_BSC_Logo_2012.svg/120px-Hertha_BSC_Logo_2012.svg.png",
  "union berlin": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/1FC_Union_Berlin.svg/120px-1FC_Union_Berlin.svg.png",
  "gladbach": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Borussia_M%C3%B6nchengladbach_2018_logo.svg/120px-Borussia_M%C3%B6nchengladbach_2018_logo.svg.png",
  "borussia monchengladbach": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Borussia_M%C3%B6nchengladbach_2018_logo.svg/120px-Borussia_M%C3%B6nchengladbach_2018_logo.svg.png",

  "atalanta": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Atalanta_logo.svg/120px-Atalanta_logo.svg.png",
  "fiorentina": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/ACF_Fiorentina_2022_logo.svg/120px-ACF_Fiorentina_2022_logo.svg.png",
  "bologna": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Bologna_FC_1909_logo.svg/120px-Bologna_FC_1909_logo.svg.png",
  "torino": "https://upload.wikimedia.org/wikipedia/en/thumb/e/ed/Torino_FC_2017_logo.svg/120px-Torino_FC_2017_logo.svg.png",
  "sassuolo": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/US_Sassuolo_2018_logo.svg/120px-US_Sassuolo_2018_logo.svg.png",
  "udinese": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Udinese_Calcio_logo.svg/120px-Udinese_Calcio_logo.svg.png",
  "verona": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Hellas_Verona_2021_logo.svg/120px-Hellas_Verona_2021_logo.svg.png",
  "cagliari": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Cagliari_Calcio_logo.svg/120px-Cagliari_Calcio_logo.svg.png",
  "genoa": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4d/Genoa_CFC_2024_logo.svg/120px-Genoa_CFC_2024_logo.svg.png",
  "como": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Como_1907.svg/120px-Como_1907.svg.png",

  "feyenoord": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Feyenoord_Rotterdam.svg/120px-Feyenoord_Rotterdam.svg.png",
  "psv": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/PSV_Eindhoven.svg/120px-PSV_Eindhoven.svg.png",
  "psv eindhoven": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/PSV_Eindhoven.svg/120px-PSV_Eindhoven.svg.png",
  "ajax amsterdam": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/120px-Ajax_Amsterdam.svg.png",
  "az alkmaar": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/AZ_Alkmaar.svg/120px-AZ_Alkmaar.svg.png",
  "twente": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/FC_Twente_2024_logo.svg/120px-FC_Twente_2024_logo.svg.png",

  "sporting cp": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Sporting_CP_logo.svg/120px-Sporting_CP_logo.svg.png",
  "sporting lisbon": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Sporting_CP_logo.svg/120px-Sporting_CP_logo.svg.png",
  "braga": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Sp_Braga.svg/120px-Sp_Braga.svg.png",
  "guimaraes": "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Vitoria_de_Guimaraes_logo.svg/120px-Vitoria_de_Guimaraes_logo.svg.png",

  "basel": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/FC_Basel_2022_Logo.svg/120px-FC_Basel_2022_Logo.svg.png",
  "young boys": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/BSC_Young_Boys_2021.svg/120px-BSC_Young_Boys_2021.svg.png",
  "zurich": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/FC_Zurich_2022.svg/120px-FC_Zurich_2022.svg.png",

  "rb salzburg": "https://upload.wikimedia.org/wikipedia/en/thumb/f/ff/FC_Red_Bull_Salzburg_logo.svg/120px-FC_Red_Bull_Salzburg_logo.svg.png",
  "austria vienna": "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/FK_Austria_Wien_logo.svg/120px-FK_Austria_Wien_logo.svg.png",
  "rapid vienna": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/SK_Rapid_Wien_logo.svg/120px-SK_Rapid_Wien_logo.svg.png",

  "brondby": "https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Bronby_IF.svg/120px-Bronby_IF.svg.png",
  "copenhagen": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/FC_Kobenhavn.svg/120px-FC_Kobenhavn.svg.png",
  "fc copenhagen": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/FC_Kobenhavn.svg/120px-FC_Kobenhavn.svg.png",

  "malmö": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Malmö_FF.svg/120px-Malmö_FF.svg.png",
  "aik": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/AIK_Fotboll.svg/120px-AIK_Fotboll.svg.png",

  "anderlecht": "https://upload.wikimedia.org/wikipedia/en/thumb/1/17/RSC_Anderlecht_logo.svg/120px-RSC_Anderlecht_logo.svg.png",
  "club brugge": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1a/Club_Brugge_KV_logo.svg/120px-Club_Brugge_KV_logo.svg.png",
  "gent": "https://upload.wikimedia.org/wikipedia/en/thumb/5/5f/AA_Gent_logo.svg/120px-AA_Gent_logo.svg.png",
  "standard liege": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Standard_Liege.svg/120px-Standard_Liege.svg.png",

  "arsenal kyiv": "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/FC_Arsenal_Kyiv_2020.svg/120px-FC_Arsenal_Kyiv_2020.svg.png",
  "dynamo kyiv": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/FC_Dynamo_Kyiv.svg/120px-FC_Dynamo_Kyiv.svg.png",
  "shakhtar donetsk": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/FC_Shakhtar_Donetsk.svg/120px-FC_Shakhtar_Donetsk.svg.png",

  "crvena zvezda": "https://upload.wikimedia.org/wikipedia/en/thumb/9/99/FK_Crvena_zvezda_2024_logo.svg/120px-FK_Crvena_zvezda_2024_logo.svg.png",
  "partizan": "https://upload.wikimedia.org/wikipedia/en/thumb/b/bc/Partizan_Beograd_logo.svg/120px-Partizan_Beograd_logo.svg.png",

  "dinamo zagreb": "https://upload.wikimedia.org/wikipedia/en/thumb/1/17/Dinamo_Zagreb.svg/120px-Dinamo_Zagreb.svg.png",
  "hajduk split": "https://upload.wikimedia.org/wikipedia/en/thumb/1/18/HNK_Hajduk_Split.svg/120px-HNK_Hajduk_Split.svg.png",

  "sparta prague": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/AC_Sparta_Praha.svg/120px-AC_Sparta_Praha.svg.png",
  "slavia prague": "https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Slavia_Praha.svg/120px-Slavia_Praha.svg.png",

  "riga": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/FC_Riga_logo.svg/120px-FC_Riga_logo.svg.png",
  "flora tallinn": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/FC_Flora_Tallinn_2018_logo.svg/120px-FC_Flora_Tallinn_2018_logo.svg.png",
  "zalgiris": "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/FK_Žalgiris_logo.svg/120px-FK_Žalgiris_logo.svg.png",

  // ----- POLSKIE KLUBY DODATKOWE -----
  "legia warszawa": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "legia warsaw": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "legia": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "lech poznan": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Lech_Poznan.svg/120px-Lech_Poznan.svg.png",
  "rakow czestochowa": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Rakow_Czestochowa_logo.svg/120px-Rakow_Czestochowa_logo.svg.png",
  "pogon szczecin": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pogon_Szczecin_logo.svg/120px-Pogon_Szczecin_logo.svg.png",
  "slask wroclaw": "https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Slask_Wroclaw.svg/120px-Slask_Wroclaw.svg.png",
  "jagiellonia bialystok": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Jagiellonia_Bialystok.svg/120px-Jagiellonia_Bialystok.svg.png",
  "wisla krakow": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Wisla_Krakow.svg/120px-Wisla_Krakow.svg.png",
  "cracovia": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Cracovia_logo.svg/120px-Cracovia_logo.svg.png",
  "korona kielce": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Korona_Kielce.svg/120px-Korona_Kielce.svg.png",
  "miedz legnica": "https://upload.wikimedia.org/wikipedia/en/thumb/6/63/Miedz_Legnica.svg/120px-Miedz_Legnica.svg.png",
  "zaglebie lubin": "https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Zaglebie_Lubin.svg/120px-Zaglebie_Lubin.svg.png",
  "piast gliwice": "https://upload.wikimedia.org/wikipedia/en/thumb/9/90/Piast_Gliwice_logo.svg/120px-Piast_Gliwice_logo.svg.png",
  "gornik zabrze": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/Gornik_Zabrze.svg/120px-Gornik_Zabrze.svg.png",
  "lechia gdansk": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/Lechia_Gdansk.svg/120px-Lechia_Gdansk.svg.png",
  "widzew lodz": "https://upload.wikimedia.org/wikipedia/en/thumb/5/58/Widzew_Lodz_2024.svg/120px-Widzew_Lodz_2024.svg.png",
  "stomil olsztyn": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7d/Stomil_Olsztyn_2021.svg/120px-Stomil_Olsztyn_2021.svg.png",
  "gornik leczna": "https://upload.wikimedia.org/wikipedia/en/thumb/2/23/Gornik_Leczna_2021.svg/120px-Gornik_Leczna_2021.svg.png",
  "radomiak radom": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/Radomiak_Radom.svg/120px-Radomiak_Radom.svg.png",
  "kks kielce": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Korona_Kielce.svg/120px-Korona_Kielce.svg.png",
};

// ----- Basketball: NBA ---------------------------------------------------------
// ESPN's team logo CDN: one stable pattern for all 30 franchises.
const espn = (abbr: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;

/** [ESPN code, full name, other names people write]. */
const NBA: [string, string, string[]][] = [
  ["atl", "Atlanta Hawks", ["hawks"]],
  ["bos", "Boston Celtics", ["celtics"]],
  ["bkn", "Brooklyn Nets", ["nets"]],
  ["cha", "Charlotte Hornets", ["hornets"]],
  ["chi", "Chicago Bulls", ["bulls"]],
  ["cle", "Cleveland Cavaliers", ["cavaliers", "cavs", "cleveland cavs"]],
  ["dal", "Dallas Mavericks", ["mavericks", "mavs", "dallas mavs"]],
  ["den", "Denver Nuggets", ["nuggets"]],
  ["det", "Detroit Pistons", ["pistons"]],
  ["gs", "Golden State Warriors", ["warriors", "gs warriors", "golden state"]],
  ["hou", "Houston Rockets", ["rockets"]],
  ["ind", "Indiana Pacers", ["pacers"]],
  ["lac", "Los Angeles Clippers", ["clippers", "la clippers"]],
  ["lal", "Los Angeles Lakers", ["lakers", "la lakers"]],
  ["mem", "Memphis Grizzlies", ["grizzlies"]],
  ["mia", "Miami Heat", ["heat"]],
  ["mil", "Milwaukee Bucks", ["bucks"]],
  ["min", "Minnesota Timberwolves", ["timberwolves", "wolves", "minnesota wolves"]],
  ["no", "New Orleans Pelicans", ["pelicans"]],
  ["ny", "New York Knicks", ["knicks", "ny knicks"]],
  ["okc", "Oklahoma City Thunder", ["thunder", "okc thunder", "okc"]],
  ["orl", "Orlando Magic", ["magic"]],
  ["phi", "Philadelphia 76ers", ["76ers", "sixers", "philadelphia sixers"]],
  ["phx", "Phoenix Suns", ["suns"]],
  ["por", "Portland Trail Blazers", ["trail blazers", "blazers", "portland blazers"]],
  ["sac", "Sacramento Kings", ["kings"]],
  ["sa", "San Antonio Spurs", ["spurs", "san antonio"]],
  ["tor", "Toronto Raptors", ["raptors"]],
  ["utah", "Utah Jazz", ["jazz"]],
  ["wsh", "Washington Wizards", ["wizards"]],
];

/** Full names: safe to match whatever sport the tip says. */
export const NBA_FULL: Record<string, string> = {};
/** Nicknames ("Heat", "Kings", "Wolves"): only for basketball tips. */
export const NBA_SHORT: Record<string, string> = {};
for (const [abbr, full, short] of NBA) {
  NBA_FULL[full] = espn(abbr);
  for (const s of short) NBA_SHORT[s] = espn(abbr);
}
