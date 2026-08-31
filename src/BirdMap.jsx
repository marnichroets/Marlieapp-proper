// "My Bird Map" — an illustrated South Africa outline with pins where Pooks
// has spotted birds. No Google Maps API: a hand-projected SVG outline plus a
// small gazetteer of common SA places. Vague locations are only placed when
// they name a known town or province; the map never invents a precise point.
import { useEffect, useState } from 'react'
import { GardenBird } from './birdTemplates'
import { BIRD_COLOUR_MAP } from './birdColourMap'
import { haversineDistanceKm, formatDurationShort, flightSpeedForSpecies } from './birdFlightSpeed'

const VIEW_W = 1000
const VIEW_H = 820
// Projection bounds (lon/lat) covering South Africa.
const LON0 = 15.5
const LON1 = 33.5
const LAT0 = -21.5 // top
const LAT1 = -35.5 // bottom

function project(lon, lat) {
  const x = ((lon - LON0) / (LON1 - LON0)) * VIEW_W
  const y = ((lat - LAT0) / (LAT1 - LAT0)) * VIEW_H
  return [x, y]
}

// National boundary as real (lon, lat) points, sourced from a public-domain
// simplified country border dataset (traced from the KwaZulu-Natal/Mozambique
// corner south along the Indian-Ocean coast, around Cape Agulhas and Cape
// Point, up the Atlantic coast, then east along the Namibia/Botswana/
// Zimbabwe/Mozambique borders back to the start) so it reads as an accurate
// outline of South Africa rather than a stylised approximation.
const OUTLINE = [
  [31.52, -29.26], [31.33, -29.4], [30.9, -29.91], [30.62, -30.42], [30.06, -31.14],
  [28.93, -32.17], [28.22, -32.77], [27.46, -33.23], [26.42, -33.61], [25.91, -33.67],
  [25.78, -33.94], [25.17, -33.8], [24.68, -33.99], [23.59, -33.79], [22.99, -33.92],
  [22.57, -33.86], [21.54, -34.26], [20.69, -34.42], [20.07, -34.8], [19.62, -34.82],
  [19.19, -34.46], [18.86, -34.44], [18.42, -34.0], [18.38, -34.14], [18.24, -33.87],
  [18.25, -33.28], [17.93, -32.61], [18.25, -32.43], [18.22, -31.66], [17.57, -30.73],
  [17.06, -29.88], [16.34, -28.58], [16.82, -28.08], [17.22, -28.36],
  [17.39, -28.78], [17.84, -28.86], [18.46, -29.05], [19.0, -28.97], [19.89, -28.46],
  [19.9, -24.77], [20.17, -24.92], [20.76, -25.87], [20.67, -26.48], [20.89, -26.83],
  [21.61, -26.73], [22.11, -26.28], [22.58, -25.98], [22.82, -25.5], [23.31, -25.27],
  [23.73, -25.39], [24.21, -25.67], [25.03, -25.72], [25.66, -25.49], [25.77, -25.17],
  [25.94, -24.7], [26.49, -24.62], [26.79, -24.24], [27.12, -23.57], [28.02, -22.83],
  [29.43, -22.09], [29.84, -22.1], [30.32, -22.27], [30.66, -22.15], [31.19, -22.25],
  [31.67, -23.66], [31.93, -24.37], [31.75, -25.48], [31.84, -25.84], [31.33, -25.66],
  [31.04, -25.73], [30.95, -26.02], [30.68, -26.4], [30.69, -26.74], [31.28, -27.29],
  [31.87, -27.18], [32.07, -26.73], [32.83, -26.74], [32.58, -27.47], [32.46, -28.3],
  [32.2, -28.75], [31.52, -29.26],
]

// Lesotho — a small mountain kingdom completely enclosed by SA. Same source
// dataset (it's the inner ring of the SA polygon). Drawn as an enclave patch
// on top of the land so it reads as the classic "hole".
const LESOTHO = [
  [28.98, -28.96], [28.54, -28.65], [28.07, -28.85], [27.53, -29.24], [27.0, -29.88],
  [27.75, -30.65], [28.11, -30.55], [28.29, -30.23], [28.85, -30.07], [29.02, -29.74],
  [29.33, -29.26], [28.98, -28.96],
]

// The 9 provinces, as internal boundary lines drawn on top of the land fill.
// Same public-domain source style as OUTLINE/LESOTHO (a simplified real
// province-boundary dataset, RDP-simplified from ~700-1100 points each down
// to a stylised ~25-75), traced in the same (lon, lat) → project() pipeline,
// so a sighting pin always lands in its visually correct province.
const PROVINCES = [
  {
    name: 'Western Cape',
    outline: [
      [23.64, -33.98], [23.39, -34.03], [23.41, -34.11], [22.73, -33.98], [22.79, -34.03], [22.19, -34.08],
      [21.75, -34.39], [20.91, -34.36], [20.84, -34.47], [20.48, -34.47], [20.0, -34.82], [19.3, -34.62],
      [19.36, -34.5], [19.12, -34.4], [19.14, -34.29], [18.82, -34.38], [18.8, -34.09], [18.48, -34.11],
      [18.45, -34.34], [18.31, -34.14], [18.49, -33.86], [18.43, -33.7], [17.95, -33.1], [18.13, -33.2],
      [18.02, -33.01], [17.9, -33.04], [17.84, -32.82], [17.97, -32.7], [18.12, -32.77], [18.3, -32.61],
      [18.28, -31.89], [17.77, -31.16], [17.97, -30.82], [18.25, -30.78], [18.41, -30.5], [18.74, -30.58],
      [18.94, -30.72], [19.03, -31.89], [19.26, -31.88], [19.48, -32.08], [19.47, -32.58], [19.59, -32.61],
      [19.61, -32.46], [20.17, -32.19], [20.1, -32.52], [20.42, -32.94], [20.71, -32.92], [20.87, -32.68],
      [21.12, -32.61], [21.55, -32.24], [21.97, -32.2], [22.29, -31.57], [23.07, -31.98], [23.4, -31.68],
      [23.7, -31.67], [23.86, -31.8], [24.02, -31.72], [24.18, -31.95], [24.09, -32.12], [23.24, -32.42],
      [23.37, -32.77], [23.07, -32.78], [22.74, -33.36], [23.56, -33.5], [23.62, -33.64], [23.37, -33.78],
      [23.69, -33.87], [23.64, -33.98],
    ],
  },
  {
    name: 'Eastern Cape',
    outline: [
      [28.64, -30.13], [29.02, -29.98], [29.12, -30.11], [28.78, -30.3], [28.78, -30.5], [29.79, -30.71],
      [30.06, -30.85], [30.2, -31.08], [29.41, -31.68], [28.55, -32.56], [27.1, -33.53], [26.48, -33.76],
      [25.79, -33.74], [25.63, -33.86], [25.7, -34.03], [24.95, -33.99], [24.83, -34.21], [23.64, -33.98],
      [23.69, -33.87], [23.37, -33.78], [23.63, -33.62], [23.51, -33.46], [22.75, -33.4], [23.07, -32.78],
      [23.37, -32.77], [23.24, -32.51], [23.33, -32.35], [24.03, -32.17], [24.18, -31.95], [24.15, -31.76],
      [24.5, -31.7], [24.56, -31.4], [25.38, -31.21], [25.51, -30.93], [25.47, -30.61], [25.73, -30.68],
      [26.15, -30.49], [26.85, -30.68], [27.01, -30.53], [27.3, -30.49], [27.35, -30.32], [27.45, -30.31],
      [27.71, -30.58], [28.08, -30.66], [28.22, -30.27], [28.64, -30.13],
    ],
  },
  {
    name: 'Northern Cape',
    outline: [
      [16.49, -28.57], [16.74, -28.48], [16.89, -28.08], [17.08, -28.03], [17.21, -28.23], [17.35, -28.23],
      [17.4, -28.7], [18.17, -28.9], [18.75, -28.84], [19.12, -28.96], [19.57, -28.53], [19.98, -28.42],
      [19.98, -24.75], [20.36, -25.03], [20.66, -25.47], [20.84, -26.13], [20.61, -26.49], [20.69, -26.89],
      [20.91, -26.8], [21.69, -26.86], [21.78, -26.68], [22.06, -26.62], [22.25, -26.35], [22.69, -26.11],
      [22.7, -26.55], [23.03, -26.67], [22.99, -27.15], [23.21, -27.33], [23.73, -27.54], [23.98, -27.42],
      [23.99, -27.31], [24.1, -27.75], [24.41, -27.68], [24.36, -27.9], [24.52, -28.1], [24.69, -27.83],
      [24.68, -27.59], [25.03, -27.71], [24.82, -27.91], [24.93, -28.1], [25.01, -28.07], [24.87, -28.65],
      [24.34, -29.65], [25.47, -30.61], [25.51, -30.93], [25.38, -31.21], [24.56, -31.4], [24.5, -31.7],
      [24.15, -31.79], [23.4, -31.68], [23.07, -31.98], [22.29, -31.57], [21.97, -32.2], [21.55, -32.24],
      [21.12, -32.61], [20.87, -32.68], [20.71, -32.92], [20.42, -32.94], [20.1, -32.52], [20.17, -32.19],
      [19.61, -32.46], [19.59, -32.61], [19.47, -32.58], [19.48, -32.08], [19.26, -31.88], [19.03, -31.89],
      [18.94, -30.72], [18.74, -30.58], [18.41, -30.5], [18.25, -30.78], [17.97, -30.82], [17.77, -31.16],
      [17.28, -30.35], [16.82, -29.1], [16.49, -28.57],
    ],
  },
  {
    name: 'Free State',
    outline: [
      [28.86, -28.77], [28.62, -28.57], [27.75, -28.91], [27.35, -29.48], [27.0, -29.67], [27.38, -30.14],
      [27.4, -30.37], [26.85, -30.68], [26.15, -30.49], [25.73, -30.68], [25.29, -30.54], [24.34, -29.65],
      [24.87, -28.65], [24.9, -28.27], [25.27, -27.8], [25.8, -27.58], [26.06, -27.72], [26.25, -27.43],
      [26.51, -27.39], [26.41, -27.18], [26.63, -27.0], [26.92, -26.96], [26.93, -26.86], [27.18, -26.96],
      [27.47, -26.88], [27.62, -26.73], [27.76, -26.78], [27.96, -26.67], [28.04, -26.82], [28.53, -27.06],
      [28.65, -26.96], [28.99, -27.0], [29.11, -27.15], [29.44, -27.25], [29.63, -27.51], [29.77, -27.45],
      [29.66, -28.16], [29.19, -28.54], [28.97, -28.57], [28.86, -28.77],
    ],
  },
  {
    name: 'KwaZulu-Natal',
    outline: [
      [28.98, -28.91], [28.86, -28.77], [28.94, -28.61], [29.66, -28.16], [29.72, -27.48], [29.86, -27.38],
      [30.4, -27.27], [30.98, -27.35], [31.24, -27.23], [31.97, -27.32], [31.99, -26.81], [32.89, -26.85],
      [32.39, -28.54], [32.01, -28.87], [31.77, -28.92], [31.36, -29.33], [30.2, -31.08], [30.06, -30.85],
      [29.79, -30.71], [28.77, -30.49], [28.78, -30.3], [29.12, -30.12], [29.02, -29.98], [29.15, -29.91],
      [29.11, -29.75], [29.44, -29.34], [29.31, -29.09], [28.98, -28.91],
    ],
  },
  {
    name: 'North West',
    outline: [
      [26.17, -24.66], [26.4, -24.63], [26.44, -24.81], [26.75, -24.87], [27.02, -24.72], [27.17, -24.98],
      [27.52, -25.1], [27.67, -24.97], [28.22, -25.08], [28.08, -25.15], [28.28, -25.4], [28.07, -25.41],
      [27.92, -25.83], [27.46, -25.89], [27.41, -26.1], [27.27, -26.17], [27.31, -26.3], [27.17, -26.4],
      [27.23, -26.51], [27.61, -26.46], [27.48, -26.87], [27.18, -26.96], [26.93, -26.86], [26.92, -26.96],
      [26.63, -27.0], [26.41, -27.18], [26.51, -27.39], [26.25, -27.43], [26.06, -27.71], [25.82, -27.58],
      [25.5, -27.68], [24.94, -28.1], [24.82, -27.91], [25.01, -27.69], [24.68, -27.59], [24.69, -27.83],
      [24.52, -28.1], [24.36, -27.9], [24.41, -27.68], [24.1, -27.75], [23.99, -27.31], [23.98, -27.42],
      [23.73, -27.54], [23.01, -27.18], [23.03, -26.67], [22.7, -26.57], [22.69, -26.11], [22.62, -26.11],
      [22.84, -25.48], [23.01, -25.31], [23.46, -25.28], [23.92, -25.63], [24.66, -25.82], [25.39, -25.74],
      [25.59, -25.62], [25.87, -24.75], [26.17, -24.66],
    ],
  },
  {
    name: 'Gauteng',
    outline: [
      [27.54, -26.77], [27.61, -26.46], [27.23, -26.51], [27.17, -26.4], [27.31, -26.3], [27.27, -26.17],
      [27.41, -26.1], [27.46, -25.89], [27.92, -25.83], [28.07, -25.41], [28.64, -25.26], [28.62, -25.15],
      [28.92, -25.14], [28.86, -25.38], [29.24, -25.34], [28.84, -26.02], [28.6, -26.0], [28.45, -26.1],
      [28.59, -26.33], [28.86, -26.42], [28.38, -26.7], [28.29, -26.91], [28.04, -26.82], [27.96, -26.67],
      [27.54, -26.77],
    ],
  },
  {
    name: 'Mpumalanga',
    outline: [
      [31.93, -24.28], [31.95, -25.96], [31.34, -25.74], [31.12, -25.91], [30.78, -26.47], [30.8, -26.81],
      [30.88, -26.77], [30.98, -27.04], [31.24, -27.23], [31.15, -27.32], [30.39, -27.27], [29.63, -27.51],
      [29.44, -27.25], [29.11, -27.15], [28.99, -27.0], [28.65, -26.96], [28.53, -27.06], [28.29, -26.91],
      [28.38, -26.7], [28.86, -26.42], [28.59, -26.33], [28.45, -26.1], [28.6, -26.0], [28.84, -26.02],
      [29.25, -25.36], [28.81, -25.36], [28.92, -25.14], [28.83, -25.11], [28.37, -25.22], [28.6, -25.0],
      [28.98, -24.88], [29.07, -24.98], [29.43, -24.76], [29.36, -25.01], [29.7, -25.19], [30.12, -24.8],
      [30.12, -24.61], [30.55, -24.61], [30.76, -24.42], [31.18, -24.66], [31.09, -24.74], [31.22, -24.91],
      [31.11, -25.03], [31.43, -24.99], [31.37, -24.77], [31.6, -24.65], [31.38, -24.48], [31.48, -24.15],
      [31.25, -24.1], [31.86, -23.96], [31.93, -24.28],
    ],
  },
  {
    name: 'Limpopo',
    outline: [
      [26.96, -23.75], [27.13, -23.52], [27.75, -23.22], [28.3, -22.6], [28.91, -22.45], [29.05, -22.22],
      [29.66, -22.13], [30.34, -22.34], [30.84, -22.28], [31.27, -22.37], [31.54, -23.16], [31.53, -23.46],
      [31.86, -23.96], [31.25, -24.1], [31.48, -24.15], [31.38, -24.48], [31.6, -24.65], [31.37, -24.77],
      [31.43, -24.99], [31.11, -25.03], [31.22, -24.91], [31.09, -24.74], [31.18, -24.66], [30.76, -24.42],
      [30.55, -24.61], [30.12, -24.61], [30.12, -24.8], [29.78, -25.04], [29.78, -25.17], [29.58, -25.17],
      [29.36, -25.01], [29.43, -24.76], [29.07, -24.98], [28.98, -24.88], [28.6, -25.0], [28.35, -25.19],
      [28.61, -25.16], [28.66, -25.25], [28.37, -25.32], [28.13, -25.2], [28.09, -25.12], [28.22, -25.08],
      [28.1, -25.01], [27.62, -24.98], [27.53, -25.1], [27.17, -24.98], [27.02, -24.72], [26.75, -24.87],
      [26.44, -24.81], [26.4, -24.63], [26.51, -24.49], [26.85, -24.25], [26.96, -23.75],
    ],
  },
]

// Label anchor for each province — the area-weighted centroid of its outline
// (not a simple point average, which can land outside a concave shape), with
// small per-province dx/dy nudges only where the raw centroid would sit too
// close to a border, Lesotho, or another label.
const PROVINCE_LABELS = [
  { name: 'Western Cape', lon: 20.59, lat: -33.01 },
  { name: 'Eastern Cape', lon: 26.4, lat: -32.17 },
  { name: 'Northern Cape', lon: 21.36, lat: -29.52 },
  { name: 'Free State', lon: 26.87, lat: -28.61 },
  { name: 'KwaZulu-Natal', lon: 30.69, lat: -28.73 },
  { name: 'North West', lon: 25.33, lat: -26.32 },
  { name: 'Gauteng', lon: 28.22, lat: -26.03 },
  { name: 'Mpumalanga', lon: 30.22, lat: -25.87 },
  { name: 'Limpopo', lon: 29.31, lat: -23.74 },
]

// Always-on reference markers so the map is legible even before any sightings.
const REFERENCE_DOTS = [
  { name: 'Potchefstroom', lon: 27.1, lat: -26.72, dx: 8, anchor: 'start' },
  { name: 'Kruger', lon: 31.59, lat: -24.99, dx: -8, anchor: 'end' },
]

const PLACES = [
  { keys: ['cape town', 'kaapstad', 'table mountain'], lon: 18.42, lat: -33.92 },
  { keys: ['stellenbosch'], lon: 18.86, lat: -33.93 },
  { keys: ['paarl'], lon: 18.96, lat: -33.73 },
  { keys: ['hermanus'], lon: 19.24, lat: -34.42 },
  { keys: ['george'], lon: 22.46, lat: -33.96 },
  { keys: ['knysna'], lon: 23.05, lat: -34.04 },
  { keys: ['mossel bay'], lon: 22.13, lat: -34.18 },
  { keys: ['oudtshoorn'], lon: 22.2, lat: -33.59 },
  { keys: ['port elizabeth', 'gqeberha', 'pe'], lon: 25.6, lat: -33.96 },
  { keys: ['east london'], lon: 27.91, lat: -33.02 },
  { keys: ['grahamstown', 'makhanda'], lon: 26.53, lat: -33.3 },
  { keys: ['durban', 'umhlanga', 'ethekwini'], lon: 31.02, lat: -29.86 },
  { keys: ['pietermaritzburg', 'pmb'], lon: 30.38, lat: -29.6 },
  { keys: ['st lucia', 'isimangaliso'], lon: 32.41, lat: -28.37 },
  { keys: ['bloemfontein', 'bloem'], lon: 26.21, lat: -29.12 },
  { keys: ['kimberley'], lon: 24.76, lat: -28.74 },
  { keys: ['johannesburg', 'joburg', 'jhb', 'sandton', 'soweto'], lon: 28.04, lat: -26.2 },
  { keys: ['boksburg', 'parkdene'], lon: 28.2794, lat: -26.2144 },
  { keys: ['pretoria', 'tshwane', 'centurion'], lon: 28.19, lat: -25.75 },
  { keys: ['potchefstroom', 'potch'], lon: 27.1, lat: -26.72 },
  { keys: ['klerksdorp'], lon: 26.67, lat: -26.85 },
  { keys: ['rustenburg'], lon: 27.24, lat: -25.67 },
  { keys: ['pilanesberg'], lon: 27.09, lat: -25.25 },
  { keys: ['sun city'], lon: 27.1, lat: -25.34 },
  { keys: ['nelspruit', 'mbombela'], lon: 30.97, lat: -25.47 },
  { keys: ['hazyview'], lon: 31.12, lat: -25.04 },
  { keys: ['skukuza', 'kruger', 'satara', 'lower sabie', 'kruger national park'], lon: 31.59, lat: -24.99 },
  { keys: ['polokwane', 'pietersburg'], lon: 29.45, lat: -23.9 },
  { keys: ['tzaneen'], lon: 30.16, lat: -23.83 },
  { keys: ['upington'], lon: 21.24, lat: -28.45 },
  { keys: ['kgalagadi'], lon: 20.6, lat: -25.75 },
  { keys: ['springbok'], lon: 17.89, lat: -29.66 },
  { keys: ['mthatha', 'umtata'], lon: 28.79, lat: -31.59 },
  { keys: ['vredefort', 'parys'], lon: 27.46, lat: -26.9 },
  { keys: ['vaal', 'vereeniging'], lon: 27.93, lat: -26.67 },
]

const PROVINCE_PLACES = [
  { keys: ['western cape'], lon: 20.59, lat: -33.01 },
  { keys: ['eastern cape'], lon: 26.4, lat: -32.17 },
  { keys: ['northern cape'], lon: 21.36, lat: -29.52 },
  { keys: ['free state'], lon: 26.87, lat: -28.61 },
  { keys: ['kwazulu-natal', 'kwazulu natal', 'kzn'], lon: 30.69, lat: -28.73 },
  { keys: ['north west', 'north-west'], lon: 25.33, lat: -26.32 },
  { keys: ['gauteng'], lon: 28.22, lat: -26.03 },
  { keys: ['mpumalanga'], lon: 30.22, lat: -25.87 },
  { keys: ['limpopo'], lon: 29.31, lat: -23.74 },
]

function inSouthAfrica(lat, lon) {
  return lat >= -35.5 && lat <= -21.5 && lon >= 15.5 && lon <= 33.5
}

function storedCoordinates(input) {
  const coordinateArray = Array.isArray(input?.coordinates)
    ? input.coordinates
    : Array.isArray(input?.locationDetails?.coordinates)
      ? input.locationDetails.coordinates
      : null
  const candidates = [
    [input?.latitude, input?.longitude],
    [input?.lat, input?.lng ?? input?.lon],
    [input?.locationDetails?.latitude, input?.locationDetails?.longitude],
    [input?.coordinates?.latitude ?? input?.coordinates?.lat, input?.coordinates?.longitude ?? input?.coordinates?.lng],
    // GeoJSON stores coordinates as [longitude, latitude]. Normalize that
    // explicit array shape here rather than relying on swap heuristics.
    [coordinateArray?.[1], coordinateArray?.[0]],
  ]
  for (const [rawLat, rawLon] of candidates) {
    if (rawLat == null || rawLon == null || rawLat === '' || rawLon === '') continue
    const lat = Number(rawLat)
    const lon = Number(rawLon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (inSouthAfrica(lat, lon)) return { lon, lat, exact: true, source: 'sighting-coordinates' }
    // Historical imports occasionally stored GeoJSON-style [longitude,
    // latitude] values in the named latitude/longitude fields. Swap only when
    // the original order is impossible for South Africa and the swapped order
    // is valid, so legitimate coordinates are never guessed at.
    if (inSouthAfrica(lon, lat)) return { lon: lat, lat: lon, exact: true, source: 'swapped-sighting-coordinates' }
  }
  return null
}

function placeNameMatches(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s-]+')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(text)
}

// Resolve saved coordinates first, then a known town, then a province-level
// approximation. Unknown/vague text stays unresolved instead of becoming a
// convincing-looking but false pin.
function locatePlace(input) {
  const coordinates = storedCoordinates(input)
  if (coordinates) return coordinates
  const lower = String(typeof input === 'string' ? input : input?.location || '').toLowerCase()
  for (const place of PLACES) {
    if (place.keys.some((key) => placeNameMatches(lower, key))) {
      return { lon: place.lon, lat: place.lat, exact: false, source: 'town-gazetteer' }
    }
  }
  for (const province of PROVINCE_PLACES) {
    if (province.keys.some((key) => placeNameMatches(lower, key))) {
      return { lon: province.lon, lat: province.lat, exact: false, source: 'province-gazetteer' }
    }
  }
  return null
}

// Colour pins by bird type (water/raptor/garden/other).
function pinColour(tags = [], category = '') {
  const hay = `${category} ${tags.join(' ')}`.toLowerCase()
  if (/water|wetland|duck|heron|egret|kingfisher|cormorant|grebe|coot|jacana|stilt|plover/.test(hay)) return '#3E78C8'
  if (/prey|raptor|eagle|hawk|buzzard|kite|owl|falcon|kestrel|vulture/.test(hay)) return '#D9534F'
  if (/garden|colourful|noisy|songbird|sunbird|weaver|robin/.test(hay)) return '#5BA85B'
  return '#E0A53A'
}

function birdTypeFor(birdLibrary, name) {
  const lower = String(name || '').toLowerCase()
  const match = birdLibrary.find((b) => b.commonName?.toLowerCase() === lower)
  return { tags: match?.tags || [], category: match?.category || '' }
}

const toPath = (pts) => `M ${pts.map(([lo, la]) => project(lo, la).map((n) => n.toFixed(1)).join(' ')).join(' L ')} Z`

// The shared South Africa map surface — outline, province boundaries +
// labels, Lesotho enclave, and the always-on reference markers. Used by both
// BirdMapPage (sighting pins) and BirdFlightMapPage (a Bird Post's live
// flight) so the two views stay pixel-for-pixel consistent — the exact same
// coordinate system, drawn once. Extra markers are passed as `children` and
// rendered on top, inside the same <svg>.
function SAMapBase({ children, ariaLabel = 'Map of South Africa', variant = '', viewBox = `0 0 ${VIEW_W} ${VIEW_H}` }) {
  const outlinePath = toPath(OUTLINE)
  const lesothoPath = toPath(LESOTHO)
  const provincePaths = PROVINCES.map((p) => ({ name: p.name, d: toPath(p.outline) }))
  const provinceLabels = PROVINCE_LABELS.map((l) => {
    const [x, y] = project(l.lon, l.lat)
    return { ...l, x: x + (l.dx || 0), y: y + (l.dy || 0) }
  })
  const refDots = REFERENCE_DOTS.map((d) => {
    const [x, y] = project(d.lon, d.lat)
    return { ...d, x, y }
  })

  return (
    <div className={`sa-map-wrap${variant ? ` ${variant}` : ''}`}>
      <svg viewBox={viewBox} className="sa-map" role="img" aria-label={ariaLabel}>
        <path className="sa-land" d={outlinePath} />
        {/* Province boundaries — internal reference lines only, no fill,
            so the land colour/shadow from .sa-land shows through. */}
        {provincePaths.map((p) => (
          <path key={p.name} className="sa-province" d={p.d} />
        ))}
        {/* Province name labels — small and muted so they read as map
            context, not competing with pins/reference markers on top. */}
        {provinceLabels.map((l) => (
          <text key={l.name} className="province-label" x={l.x.toFixed(1)} y={l.y.toFixed(1)} textAnchor="middle">
            {l.name}
          </text>
        ))}
        <path className="sa-lesotho" d={lesothoPath} />
        {/* Always-on reference markers (Potchefstroom + Kruger) */}
        {refDots.map((d) => (
          <g key={d.name} className="map-ref" transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`}>
            <circle className="map-ref-dot" r="7" />
            <text className="map-ref-label" x={d.dx} y="5" textAnchor={d.anchor}>{d.name}</text>
          </g>
        ))}
        {children}
      </svg>
    </div>
  )
}

export function BirdMapPage({ data, onBack }) {
  const birdLibrary = data.birdLibrary || []
  const sightings = data.sightings || []

  // Group sightings by their normalized geographic position so different
  // labels for the same saved place do not create overlapping pins.
  const groups = new Map()
  for (const s of sightings) {
    const place = locatePlace(s)
    if (!place) continue
    const hasCoords = place.source.includes('coordinates')
    const label = String(s.location || '').trim() || 'Saved coordinates'
    const precision = hasCoords ? 5 : 3
    const key = `${place.lat.toFixed(precision)}|${place.lon.toFixed(precision)}`
    if (!groups.has(key)) {
      groups.set(key, { label, sightings: [], place })
    }
    groups.get(key).sightings.push(s)
  }
  const pins = [...groups.entries()].map(([key, g]) => {
    const first = g.sightings[0]
    const { tags, category } = birdTypeFor(birdLibrary, first.birdName)
    const [x, y] = project(g.place.lon, g.place.lat)
    return { ...g, key, x, y, colour: pinColour(tags, category) }
  })

  const [activeKey, setActiveKey] = useState(null)
  const active = pins.find((p) => p.key === activeKey) || null
  const unresolvedCount = sightings.length - [...groups.values()].reduce((sum, group) => sum + group.sightings.length, 0)

  return (
    <div className="page-grid bird-map-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Field guide</p>
            <h2>My Bird Map 🗺️</h2>
          </div>
          <span className="status-pill">{pins.length} spot{pins.length === 1 ? '' : 's'}</span>
        </div>

        {unresolvedCount > 0 && (
          <p className="fine-print map-location-note">
            {unresolvedCount} {unresolvedCount === 1 ? 'sighting has' : 'sightings have'} only a vague location, so {unresolvedCount === 1 ? 'it is' : 'they are'} not pinned precisely.
          </p>
        )}

        <>
          <div className="map-legend">
            <span><i style={{ background: '#3E78C8' }} /> Water</span>
            <span><i style={{ background: '#D9534F' }} /> Raptor</span>
            <span><i style={{ background: '#5BA85B' }} /> Garden</span>
            <span><i style={{ background: '#E0A53A' }} /> Other</span>
          </div>

          <SAMapBase ariaLabel="Map of South Africa with bird sighting pins">
            {pins.map((p) => {
              // Use the coordinate-aware group key: identical text labels can
              // represent different confirmed locations and must stay distinct.
              const on = activeKey === p.key
              return (
                <g
                  key={p.key}
                  className={`map-pin${on ? ' active' : ''}`}
                  transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                  onClick={() => setActiveKey(on ? null : p.key)}
                >
                  <circle className="map-pin-halo" r={on ? 26 : 0} fill={p.colour} />
                  <path className="map-pin-drop" d="M0 0 C -9 -16 -9 -28 0 -28 C 9 -28 9 -16 0 0 Z" fill={p.colour} />
                  <circle cx="0" cy="-20" r="5" fill="#fff" />
                  {p.sightings.length > 1 && (
                    <text className="map-pin-count" x="0" y="-16" textAnchor="middle">{p.sightings.length}</text>
                  )}
                </g>
              )
            })}
          </SAMapBase>

          {pins.length === 0 ? (
            <p className="fine-print map-hint">
              📍 Add a location when you save a bird and it will appear here on the map.
            </p>
          ) : active ? (
              <div className="map-detail">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">📍 {active.label}</p>
                    <h3>{active.sightings.length} sighting{active.sightings.length === 1 ? '' : 's'} here</h3>
                  </div>
                  <button className="text-btn" type="button" onClick={() => setActiveKey(null)}>Close</button>
                </div>
                <div className="map-sighting-list">
                  {active.sightings.map((s) => (
                    <article className="map-sighting" key={s.id}>
                      {s.photo ? (
                        <img src={s.photo} alt={s.birdName} className="map-sighting-thumb" />
                      ) : (
                        <div className="map-sighting-thumb no-photo-yet"><span aria-hidden="true">📷</span></div>
                      )}
                      <div>
                        <h4>{s.birdName}</h4>
                        <p className="fine-print">{new Date(s.dateSpotted || s.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {s.notes && <p className="map-sighting-note">{s.notes}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="fine-print map-hint">Tap a pin to see the birds you spotted there 🐦</p>
            )}
        </>
      </section>
    </div>
  )
}

// Ray-casting point-in-polygon test, used only to label the flight path's
// two endpoints with a province name (e.g. "Western Cape → Gauteng") purely
// from the lat/lng already on the post — no new data, no address lookup.
function pointInPolygon(lon, lat, outline) {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [loni, lati] = outline[i]
    const [lonj, latj] = outline[j]
    const intersect =
      lati > lat !== latj > lat &&
      lon < ((lonj - loni) * (lat - lati)) / (latj - lati) + loni
    if (intersect) inside = !inside
  }
  return inside
}

function provinceForPoint(lon, lat) {
  const hit = PROVINCES.find((p) => pointInPolygon(lon, lat, p.outline))
  return hit ? hit.name : null
}

function speciesLabelForFlight(birdLibrary, speciesId) {
  const found = (birdLibrary || []).find((b) => b.id === speciesId)
  if (found?.commonName) return found.commonName
  return String(speciesId || '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Live flight visualisation for the active Bird Post, reusing the exact same
// map surface (SAMapBase) and the exact same elapsed-time/travel-time ticking
// logic as the progress-bar card on Home (see BirdPostCard in App.jsx) — just
// rendered as a real position on the province map instead of a bar. Reached
// via the "See it flying" link on that card.
export function BirdFlightMapPage({ birdPost, birdLibrary, onBack }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!birdPost || birdPost.destLat == null || birdPost.destLng == null) {
    return (
      <div className="page-grid bird-map-page">
        <section className="soft-card full-span">
          <button className="text-btn back-btn" type="button" onClick={onBack}>
            ← Back
          </button>
          <p className="fine-print map-hint">No bird is currently in flight with a confirmed destination.</p>
        </section>
      </div>
    )
  }

  const destLat = birdPost.destLat
  const destLng = birdPost.destLng
  const departedAtMs = new Date(birdPost.departedAt || birdPost.createdAt).getTime()
  const etaMs = birdPost.estimatedArrivalAt
    ? new Date(birdPost.estimatedArrivalAt).getTime()
    : departedAtMs + birdPost.travelTimeSeconds * 1000
  const progress = birdPost.delivered
    ? 1
    : Math.min(1, Math.max(0, (now - departedAtMs) / Math.max(1, etaMs - departedAtMs)))
  const arrived = progress >= 1

  const [sx, sy] = project(birdPost.senderLng, birdPost.senderLat)
  const [ex, ey] = project(destLng, destLat)

  // A real journey curves — draw the route as a quadratic Bézier instead of a
  // straight line, bowed toward whichever perpendicular direction reads as
  // "up" on the map (a consistent, gentle arc regardless of travel
  // direction, the way flight-tracker route maps bow their great circles).
  const dx = ex - sx
  const dy = ey - sy
  const straightDist = Math.hypot(dx, dy) || 1
  const nx = -dy / straightDist
  const ny = dx / straightDist
  const bow = Math.min(straightDist * 0.22, 130)
  const midX = (sx + ex) / 2
  const midY = (sy + ey) / 2
  const candidateAY = midY + ny * bow
  const candidateBY = midY - ny * bow
  const bowSign = candidateAY < candidateBY ? 1 : -1
  const cx = midX + nx * bow * bowSign
  const cy = midY + ny * bow * bowSign

  // Point-at-t and tangent-at-t on that same quadratic Bézier, so the bird's
  // position and the heading it banks toward both come from one curve.
  const t = progress
  const bx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t ** 2 * ex
  const by = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t ** 2 * ey
  const tanX = 2 * (1 - t) * (cx - sx) + 2 * t * (ex - cx)
  const tanY = 2 * (1 - t) * (cy - sy) + 2 * t * (ey - cy)
  const tanLen = Math.hypot(tanX, tanY) || 1
  // GardenBird's sprites face right by default, so "flying left" mirrors the
  // sprite (scaleX) rather than rotating it 180° upside-down; on top of that,
  // a small bank tilt (climbing = nose up, descending = nose down) reads as
  // real flight instead of a paper cutout sliding along a wire.
  const facingLeft = tanX < 0
  const bankDeg = Math.max(-16, Math.min(16, (-tanY / tanLen) * 16)) * (facingLeft ? -1 : 1)
  // A slow sine bob layered on top of the curve position — purely cosmetic
  // (never touches progress/timing), just enough life that the bird reads as
  // riding air currents rather than sliding along a rail.
  const bob = arrived ? 0 : Math.sin(now / 420 + t * 9) * 3.5

  const distanceKm = haversineDistanceKm(birdPost.senderLat, birdPost.senderLng, destLat, destLng)
  const remainingSeconds = Math.max(0, (etaMs - now) / 1000)
  const speciesEntry = BIRD_COLOUR_MAP[birdPost.birdSpeciesId]
  const speciesLabel = speciesLabelForFlight(birdLibrary, birdPost.birdSpeciesId)
  const fromProvince = provinceForPoint(birdPost.senderLng, birdPost.senderLat) || 'the field'
  const toProvince = provinceForPoint(destLng, destLat) || 'home'
  const curvePath = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
  const routeMinX = Math.max(0, Math.min(sx, ex, cx) - 58)
  const routeMaxX = Math.min(VIEW_W, Math.max(sx, ex, cx) + 58)
  const routeMinY = Math.max(0, Math.min(sy, ey, cy) - 58)
  const routeMaxY = Math.min(VIEW_H, Math.max(sy, ey, cy) + 58)
  const routeViewBox = `${routeMinX.toFixed(1)} ${routeMinY.toFixed(1)} ${(routeMaxX - routeMinX).toFixed(1)} ${(routeMaxY - routeMinY).toFixed(1)}`

  return (
    <div className="page-grid bird-map-page">
      <section className="soft-card full-span">
        <button className="text-btn back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bird Post</p>
            <h2>{arrived ? `${speciesLabel} has landed` : `${speciesLabel} is flying`} 🐦</h2>
          </div>
        </div>

        <p className="flight-route-label">
          <span><small>From</small>{fromProvince}</span>
          <span className="flight-route-arrow" aria-hidden="true">
            ⟶
          </span>
          <span><small>To</small>{toProvince}</span>
        </p>

        {birdPost.message && (
          <blockquote className="flight-letter">
            <span aria-hidden="true">💌</span>
            <div><small>Carrying this little letter</small><p>{birdPost.message}</p></div>
          </blockquote>
        )}

        <SAMapBase variant="bird-post-map" viewBox={routeViewBox} ariaLabel={`Map showing a ${speciesLabel} flying from ${fromProvince} to ${toProvince}`}>
          <defs>
            <marker id="bird-flight-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--coral)" />
            </marker>
          </defs>
          <g className="flight-map-magic" aria-hidden="true">
            <text x="105" y="145">✦</text><text x="795" y="185">♡</text>
            <text x="190" y="650">· ✦</text><text x="850" y="610">✦</text>
          </g>
          {/* Full planned route, faint — the "distance not yet flown". */}
          <path className="flight-route-guide" d={curvePath} />
          {/* Same curve, revealed only up to the current progress via
              pathLength + dashoffset — the browser measures the actual curve
              length itself, so this tracks the Bézier exactly with no extra
              math, and the dashoffset transition makes it glide smoothly
              between the once-a-second progress ticks instead of jumping. */}
          <path
            className={`flight-route-flown${arrived ? ' arrived' : ''}`}
            d={curvePath}
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress * 100}
            markerEnd={arrived ? undefined : 'url(#bird-flight-arrow)'}
          />
          <g className="flight-endpoint flight-start" transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
            <circle r="6" />
            <text className="flight-endpoint-label" x="0" y="18" textAnchor="middle">START</text>
          </g>
          <g
            className={`flight-endpoint flight-end${arrived ? ' arrived' : ''}`}
            transform={`translate(${ex.toFixed(1)} ${ey.toFixed(1)})`}
          >
            {arrived && (
              <>
                <circle className="flight-arrival-ring" r="10" />
                <circle className="flight-arrival-ring flight-arrival-ring-delay" r="10" />
              </>
            )}
            <circle r="6" />
            <text className="flight-endpoint-label" x="0" y="18" textAnchor="middle">DESTINATION</text>
          </g>
          {arrived &&
            ARRIVAL_BURST_PARTICLES.map((p, i) => (
              <text
                key={i}
                className="flight-arrival-particle"
                x={ex.toFixed(1)}
                y={ey.toFixed(1)}
                style={{ '--px': `${p.dx}px`, '--py': `${p.dy}px`, animationDelay: `${p.delay}ms` }}
              >
                {p.glyph}
              </text>
            ))}
          {!arrived && (
            <g className="flight-current-marker" transform={`translate(${bx.toFixed(1)} ${(by + bob).toFixed(1)})`} aria-label="Bird's current position">
              <circle className="flight-current-halo" r="18" />
              <text className="flight-current-label" x="0" y="-22" textAnchor="middle">NOW</text>
            </g>
          )}
          {speciesEntry ? (
            // GardenBird renders its own <svg> sized via CSS px — nesting
            // that directly inside another <svg> doesn't reliably respect
            // those CSS dimensions (the browser resolves them against the
            // wrong coordinate system). foreignObject gives it a real HTML/
            // CSS layout context instead, exactly like every other place
            // GardenBird is already used (e.g. BirdPostCard's progress bar).
            <foreignObject
              x={(bx - 18).toFixed(1)}
              y={(by - 18 + bob).toFixed(1)}
              width="36"
              height="36"
              style={{ overflow: 'visible' }}
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                className={`flight-bird-icon${arrived ? ' landed' : ''}`}
                style={
                  !arrived
                    ? { transform: `scaleX(${facingLeft ? -1 : 1}) rotate(${bankDeg.toFixed(1)}deg)` }
                    : undefined
                }
              >
                <GardenBird
                  template={speciesEntry.template}
                  zones={speciesEntry.zones}
                  size={36}
                  ground={false}
                  flying={!arrived}
                />
              </div>
            </foreignObject>
          ) : (
            <text
              className="flight-fallback-icon"
              x={bx.toFixed(1)}
              y={(by + bob).toFixed(1)}
              textAnchor="middle"
              dy="8"
            >
              🐦
            </text>
          )}
        </SAMapBase>

        {!arrived && (
          <div className="flight-progress-summary" aria-label={`Flight progress ${Math.round(progress * 100)} percent`}>
            <span><strong>{Math.round(progress * 100)}%</strong> of the journey flown</span>
            <div className="progress-track"><span style={{ width: `${progress * 100}%` }} /></div>
          </div>
        )}

        {arrived ? (
          <p className="flight-arrived-banner">Delivered! 📬 {distanceKm ? `Flew ${Math.round(distanceKm)}km to get here.` : ''}</p>
        ) : (
          <div className="flight-stats-row">
            <div className="flight-stat">
              <span className="flight-stat-label">Distance</span>
              <span className="flight-stat-value">{Math.round(distanceKm)}km</span>
            </div>
            <div className="flight-stat">
              <span className="flight-stat-label">Speed</span>
              <span className="flight-stat-value">{Math.round(birdPost.flightSpeedKmh || flightSpeedForSpecies(birdPost.birdSpeciesId))} km/h</span>
            </div>
            <div className="flight-stat">
              <span className="flight-stat-label">Time remaining</span>
              <span className="flight-stat-value">{formatDurationShort(remainingSeconds)}</span>
            </div>
            <div className="flight-stat">
              <span className="flight-stat-label">Arrival</span>
              <span className="flight-stat-value">{new Date(etaMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// Fixed set of little glyphs that burst outward from the destination pin the
// moment a post lands — decorative only, generated once at module scope so
// the pattern doesn't reshuffle every render/tick.
const ARRIVAL_BURST_PARTICLES = [
  { glyph: '✨', dx: -34, dy: -28, delay: 0 },
  { glyph: '🪶', dx: 30, dy: -32, delay: 60 },
  { glyph: '✨', dx: 40, dy: 10, delay: 120 },
  { glyph: '🪶', dx: -40, dy: 8, delay: 40 },
  { glyph: '✨', dx: 0, dy: -40, delay: 90 },
  { glyph: '🪶', dx: 10, dy: 36, delay: 150 },
]
