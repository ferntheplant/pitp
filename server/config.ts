// TODO: set these via env variables with runtime validation
// TODO: fix relative filepaths to be w.r.t. project root rather than main.ts
const DEBUG = true;

type Party = {
	name: string;
	start: Date;
	end?: Date;
	location: string;
	description?: string;
	password: string;
};

const partyConfig: Party = {
	name: "Test party",
	start: new Date("11/11/2011"),
	end: new Date("12/12/2012"),
	location: "Ur moms house",
	description: "gang gang",
	password: "urmom69",
};

const config = <const>{
	SERVICE_NAME: "pitp",
	COOKIE_NAME: `pitp-${partyConfig.name}`,
	VERSION: "0.0.1",
	DEBUG: DEBUG,
	LOG_LEVEL: DEBUG ? "debug" : "info",
	PORT: 8080,
	HOSTNAME: "localhost",
	PARTY: partyConfig,
};
Object.freeze(config);

export const CONFIG = config;
