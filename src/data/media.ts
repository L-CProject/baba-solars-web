/**
 * Stock photos from Unsplash (free under the Unsplash License, no attribution
 * required). Replace with the client's own installation photos: put files in
 * /public/images/ and use paths like '/images/site-1.jpg', or paste URLs in
 * Admin → Banner slides / Gallery / Projects.
 */
export function unsplash(id: string, width = 1600): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`
}

export const IMG = {
  monoPanels: 'photo-1613665813446-82a78c468a1d',
  houseWithSolar: 'photo-1655300256335-beef51a914fe',
  roofRows: 'photo-1694327671725-e2a81cda3436',
  commercialRoofIndia: 'photo-1631771819642-90cee9a2ccac',
  rooftopInstalled: 'photo-1617269778723-73a40cf299bd',
  panelsOnRoof: 'photo-1658298775754-5839ffd434cc',
  installerOnRoof: 'photo-1624397640148-949b1732bb0a',
  technicianWorking: 'photo-1668097613572-40b7c11c8727',
  crewOnRoof: 'photo-1660330589243-4c640d878052',
  manOnRoof: 'photo-1660330589257-813305a4a383',
  carryingPanel: 'photo-1559302504-64aae6ca6b6d',
  holdingPanel: 'photo-1719848576338-9516ba7ccd8b',
  hardHat: 'photo-1648135327756-b606e2eb8caa',
  fieldGreen: 'photo-1509391366360-2e959784a276',
  panelBlueSky: 'photo-1508514177221-188b1cf16e9d',
  aerialRows: 'photo-1642950863398-1fc3600a5313',
  groundMounted: 'photo-1497435334941-8c899ee9e8e9',
  closeUpBuilding: 'photo-1724041875334-0a6397111c7e',
  bluePanels: 'photo-1574360773950-133867861ae9',
  panelSky: 'photo-1679046410011-b6bf7ce71f22',
  cleaningBrush: 'photo-1754619880959-2b0528375883',
  crewWorking: 'photo-1660330589505-9a433a742a7b',
} as const

export const img = (key: keyof typeof IMG, width?: number) => unsplash(IMG[key], width)
