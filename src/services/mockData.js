/**
 * mockData.js — seed records for the demo. In a real deployment this
 * module would be replaced by a network-backed service; every other
 * module reaches this data only through services/api.js.
 */
import { slugify } from "../utilities/helpers.js";

const rawTeams = [
  {
    name: "Nairobi Marlins",
    city: "Nairobi",
    founded: 2011,
    home: "Ngong Road Diamond",
    wins: 18,
    losses: 6,
    roster: [
      { name: "Brian Otieno", position: "Pitcher", number: 21 },
      { name: "Kevin Mwangi", position: "Catcher", number: 7 },
      { name: "Dennis Kiplagat", position: "Shortstop", number: 14 },
      { name: "Felix Wanjiru", position: "First Base", number: 33 },
      { name: "Sammy Njoroge", position: "Outfield", number: 9 },
    ],
  },
  {
    name: "Mombasa Tide",
    city: "Mombasa",
    founded: 2014,
    home: "Nyali Coastal Field",
    wins: 15,
    losses: 9,
    roster: [
      { name: "Juma Bakari", position: "Pitcher", number: 3 },
      { name: "Ali Hassan", position: "Third Base", number: 18 },
      { name: "Peter Katana", position: "Outfield", number: 27 },
      { name: "Omar Said", position: "Catcher", number: 12 },
      { name: "Victor Charo", position: "Second Base", number: 5 },
    ],
  },
  {
    name: "Kisumu Herons",
    city: "Kisumu",
    founded: 2016,
    home: "Dunga Bay Park",
    wins: 11,
    losses: 13,
    roster: [
      { name: "Collins Odhiambo", position: "Pitcher", number: 8 },
      { name: "Brian Okoth", position: "Shortstop", number: 22 },
      { name: "Elvis Owuor", position: "First Base", number: 4 },
      { name: "Frank Ochieng", position: "Outfield", number: 16 },
      { name: "Michael Onyango", position: "Catcher", number: 29 },
    ],
  },
  {
    name: "Eldoret Highlanders",
    city: "Eldoret",
    founded: 2018,
    home: "Kapseret Grounds",
    wins: 13,
    losses: 11,
    roster: [
      { name: "Kiprono Bett", position: "Pitcher", number: 11 },
      { name: "Wesley Kiptoo", position: "Third Base", number: 24 },
      { name: "Evans Rotich", position: "Outfield", number: 6 },
      { name: "Daniel Cheruiyot", position: "Second Base", number: 19 },
      { name: "Ronald Kigen", position: "Catcher", number: 2 },
    ],
  },
  {
    name: "Nakuru Rift Hawks",
    city: "Nakuru",
    founded: 2015,
    home: "Menengai Field",
    wins: 9,
    losses: 15,
    roster: [
      { name: "Josphat Maina", position: "Pitcher", number: 15 },
      { name: "Simon Gitau", position: "Shortstop", number: 31 },
      { name: "Alex Mutiso", position: "First Base", number: 10 },
      { name: "Brian Karanja", position: "Outfield", number: 23 },
      { name: "Paul Ndung'u", position: "Catcher", number: 1 },
    ],
  },
  {
    name: "Thika Sugar Cutters",
    city: "Thika",
    founded: 2019,
    home: "Blue Post Diamond",
    wins: 7,
    losses: 17,
    roster: [
      { name: "Martin Gathoni", position: "Pitcher", number: 30 },
      { name: "Erick Mburu", position: "Third Base", number: 17 },
      { name: "Duncan Kamau", position: "Outfield", number: 25 },
      { name: "Josiah Ndegwa", position: "Second Base", number: 13 },
      { name: "Vincent Njau", position: "Catcher", number: 20 },
    ],
  },
];

export const teams = rawTeams.map((team) => ({
  id: slugify(team.name),
  ...team,
}));

function teamId(name) {
  return slugify(name);
}

export const matches = [
  {
    id: "m-2001",
    homeTeamId: teamId("Nairobi Marlins"),
    awayTeamId: teamId("Mombasa Tide"),
    venue: "Ngong Road Diamond",
    date: "2026-09-14T13:30:00+03:00",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    innings: 9,
  },
  {
    id: "m-2002",
    homeTeamId: teamId("Kisumu Herons"),
    awayTeamId: teamId("Eldoret Highlanders"),
    venue: "Dunga Bay Park",
    date: "2026-09-11T15:00:00+03:00",
    status: "live",
    homeScore: 3,
    awayScore: 2,
    innings: 9,
    inningNow: 6,
  },
  {
    id: "m-2003",
    homeTeamId: teamId("Nakuru Rift Hawks"),
    awayTeamId: teamId("Thika Sugar Cutters"),
    venue: "Menengai Field",
    date: "2026-09-06T13:00:00+03:00",
    status: "final",
    homeScore: 6,
    awayScore: 4,
    innings: 9,
  },
  {
    id: "m-2004",
    homeTeamId: teamId("Mombasa Tide"),
    awayTeamId: teamId("Nakuru Rift Hawks"),
    venue: "Nyali Coastal Field",
    date: "2026-09-03T14:00:00+03:00",
    status: "final",
    homeScore: 8,
    awayScore: 1,
    innings: 9,
  },
  {
    id: "m-2005",
    homeTeamId: teamId("Eldoret Highlanders"),
    awayTeamId: teamId("Nairobi Marlins"),
    venue: "Kapseret Grounds",
    date: "2026-08-29T13:30:00+03:00",
    status: "final",
    homeScore: 2,
    awayScore: 5,
    innings: 9,
  },
  {
    id: "m-2006",
    homeTeamId: teamId("Thika Sugar Cutters"),
    awayTeamId: teamId("Kisumu Herons"),
    venue: "Blue Post Diamond",
    date: "2026-09-20T13:00:00+03:00",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    innings: 9,
  },
  {
    id: "m-2007",
    homeTeamId: teamId("Nairobi Marlins"),
    awayTeamId: teamId("Nakuru Rift Hawks"),
    venue: "Ngong Road Diamond",
    date: "2026-08-22T13:30:00+03:00",
    status: "final",
    homeScore: 9,
    awayScore: 3,
    innings: 9,
  },
];
