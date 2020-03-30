import {Action} from "@ngrx/store";

export enum ActionTypes {
	AddLoading = "Add Loading",
	RemoveLoading = "Remove Loading",
	setLoadingProgress = "Set Loading Progress"
}

export interface LoadingAction extends Action {
	readonly type: ActionTypes.AddLoading | ActionTypes.RemoveLoading | ActionTypes.setLoadingProgress;
	name: string;
	progress?: number;
}
