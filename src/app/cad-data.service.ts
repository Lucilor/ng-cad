import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";
import {State} from "./store/state";
import {LoadingAction, ActionTypes} from "./store/actions";
import {HttpClient} from "@angular/common/http";
import {apiBasePath, Response, transformData} from "./app.common";
import {CadData} from "@lucilor/cad-viewer";

@Injectable({
	providedIn: "root"
})
export class CadDataService {
	constructor(private store: Store<State>, private http: HttpClient) {}

	async getRawData(encode: string, data: string) {
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getWritings"});
		try {
			const result = await this.http.get<Response>(`${apiBasePath}/peijian/cad/read_dxf_file/${encode}?data=${data}`).toPromise();
			console.log(result);
			if (result.code === 0) {
				transformData(result.data, "array");
				return result.data as CadData;
			} else {
				throw new Error(result.msg);
			}
		} catch (error) {
		} finally {
			// this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getWritings"});
		}
	}
}
