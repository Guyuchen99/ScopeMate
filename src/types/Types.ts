export type JobDetails = {
	jobId: string;
	jobTitle: string;
	companyName: string;
	fullJobDescription: string;
};

export type JobAnalysisEntry = {
	jobTitle: string;
	companyName: string;
	isDev: boolean;
	isFit: boolean;
	reason: string;
};

export type JobAnalysisMap = Record<string, JobAnalysisEntry>;
