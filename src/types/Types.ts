export type JobDetails = {
	jobId: string;
	jobTitle: string;
	companyName: string;
  applicationProcedure: string, 
	fullJobDescription: string;
};

export type JobAnalysisEntry = {
	jobTitle: string;
	companyName: string;
	applicationProcedure: string;
	isDev: boolean;
	isFit: boolean;
	reason: string;
};

export type JobAnalysisMap = Record<string, JobAnalysisEntry>;
