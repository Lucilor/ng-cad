import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";
import {State} from "../store/state";
import {HttpClient} from "@angular/common/http";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {AlertComponent} from "../components/alert/alert.component";
import {ActivatedRoute} from "@angular/router";
import {LoadingAction, ActionTypes} from "../store/actions";
import {Response} from "../app.common";
import {CadData, CadOption} from "../cad-viewer/cad-data/cad-data";
import {CadViewer} from "../cad-viewer/cad-viewer";
import {SessionStorage, RSAEncrypt} from "@lucilor/utils";

const session = new SessionStorage("cad-data");

@Injectable({
	providedIn: "root"
})
export class CadDataService {
	baseURL: string;
	encode: string;
	data: string;
	silent = false;
	constructor(
		private store: Store<State>,
		private http: HttpClient,
		private dialog: MatDialog,
		private snackBar: MatSnackBar,
		route: ActivatedRoute
	) {
		this.baseURL = localStorage.getItem("baseURL");
		const params = route.snapshot.queryParams;
		this.encode = params.encode ? encodeURIComponent(params.encode) : "";
		this.data = params.data ? encodeURIComponent(params.data) : "";
	}

	private alert(content: any) {
		if (!this.silent) {
			this.dialog.open(AlertComponent, {data: {content}});
		}
	}

	private async _request(url: string, name: string, method: "GET" | "POST", postData: any = {}) {
		const {baseURL, encode, data} = this;
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name});
		try {
			let response = await this.http.get<Response>(`${baseURL}/${url}/${encode}?data=${data}`).toPromise();
			if (method === "GET") {
				response = await this.http.get<Response>(`${baseURL}/${url}/${encode}?data=${data}`).toPromise();
			}
			if (method === "POST") {
				const formData = new FormData();
				formData.append("data", RSAEncrypt(postData));
				response = await this.http.post<Response>(`${baseURL}/${url}/${encode}?data=${data}`, formData).toPromise();
			}
			if (response.code === 0) {
				return response;
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name});
		}
	}

	async getCadData() {
		if (!this.data) {
			try {
				return [new CadData(this.loadCurrentCad())];
			} catch (error) {
				this.alert(error);
				return [new CadData()];
			}
		}
		const response = await this._request("peijian/cad/getCad", "getCadData", "GET");
		if (!response) {
			return [];
		}
		if (!Array.isArray(response.data)) {
			response.data = [response.data];
		}
		const result: CadData[] = [];
		response.data.forEach((d) => result.push(new CadData(d)));
		return result;
	}

	async postCadData(cadData: CadData[], data?: string) {
		const {baseURL, encode} = this;
		if (!data) {
			data = this.data;
		}
		if (cadData.length < 1) {
			return [];
		}
		cadData.forEach((d) => d.sortComponents());
		const result: CadData[] = [];
		let counter = 0;
		let successCounter = 0;
		this.store.dispatch<LoadingAction>({
			type: ActionTypes.setLoadingProgress,
			name: "postCadData",
			progress: 0
		});
		return new Promise<CadData[]>(async (resolve) => {
			for (let i = 0; i < cadData.length; i++) {
				const formData = new FormData();
				if (data) {
					formData.append("data", data);
				}
				const d = cadData[i];
				formData.append("cadData", JSON.stringify(d.export()));
				try {
					const response = await this.http.post<Response>(`${baseURL}/peijian/cad/setCAD/${encode}`, formData).toPromise();
					if (response.code === 0) {
						result[i] = new CadData(response.data);
						successCounter++;
					} else {
						throw new Error(response.msg);
					}
				} catch (error) {
					result[i] = new CadData();
				} finally {
					counter++;
				}
				this.store.dispatch<LoadingAction>({
					type: ActionTypes.setLoadingProgress,
					name: "postCadData",
					progress: counter / cadData.length
				});
				if (counter >= cadData.length) {
					setTimeout(() => {
						this.store.dispatch<LoadingAction>({
							type: ActionTypes.setLoadingProgress,
							name: "postCadData",
							progress: -1
						});
					}, 200);
					if (successCounter === counter) {
						this.snackBar.open(`${successCounter > 1 ? "全部" : ""}成功`);
					} else {
						this.snackBar.open(`${counter > 1 ? (successCounter > 0 ? "部分" : "全部") : ""}失败`);
					}
					resolve(result);
				}
			}
		});
	}

	async getCadDataPage(page: number, limit: number, search?: string, zhuangpei = false, options?: CadOption[]) {
		const postData = {page, limit, search, xiaodaohang: "CAD", zhuangpei, options};
		const response = await this._request("peijian/cad/getCad", "getCadDataPage", "POST", postData);
		if (!response) {
			return {data: [], count: 0};
		}
		const result: CadData[] = [];
		response.data.forEach((d) => {
			const {_id, 分类, 名字, 条件, 选项} = d;
			if (d.json && typeof d.json === "object") {
				const json = d.json;
				json.name = 名字;
				json.type = 分类;
				json.options = 选项;
				json.conditions = 条件;
				result.push(new CadData(json));
			} else {
				result.push(new CadData({id: _id, name: 名字, type: 分类, options: 选项, conditions: 条件}));
			}
		});
		return {data: result, count: response.count};
	}

	async replaceData(source: CadData, target: string) {
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getCadDataPage"});
		source.sortComponents();
		const response = await this._request("peijian/cad/replaceCad", "replaceData", "POST", {source: source.export(), target});
		if (!response) {
			return null;
		}
		this.snackBar.open(response.msg);
		return new CadData(response.data);
	}

	saveCadStatus(cad: CadViewer, field: string) {
		const status = {id: cad.data.id, position: cad.position.toArray()};
		session.save(field, status);
		return status;
	}

	loadCadStatus(cad: CadViewer, field: string) {
		const status = session.load(field, true);
		if (status && status.id === cad.data.id) {
			if (Array.isArray(status.position)) {
				cad.position.set(status.position[0], status.position[1], status.position[2]);
			}
			return status;
		} else {
			return null;
		}
	}

	saveCurrentCad(data: CadData) {
		session.save("currentCad", data.export());
	}

	loadCurrentCad() {
		return session.load("currentCad", true);
	}

	async getOptions(data: CadData, name: string, search: string, page: number, limit: number) {
		const exportData = data.export();
		const postData = {
			name,
			search,
			page,
			limit,
			mingzi: exportData.name,
			fenlei: exportData.type,
			xuanxiang: exportData.options,
			tiaojian: exportData.conditions
		};
		const response = await this._request("peijian/cad/getOptions", "getOptions", "POST", postData);
		if (response) {
			return {data: response.data as string[], count: response.count};
		}
		return {data: [], count: 0};
	}

	async getShowLineInfo() {
		const response = await this._request("peijian/cad/showLineInfo", "getShowLineInfo", "GET");
		return response ? (response.data as boolean) : false;
	}

	async getSampleFormulas() {
		const response = await this._request("peijian/Houtaisuanliao/getSampleFormulas", "getSampleFormulas", "GET");
		if (response) {
			return response.data as string[];
		}
		return [];
	}
}
