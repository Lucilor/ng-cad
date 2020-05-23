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
import {CadData} from "../cad-viewer/cad-data/cad-data";
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

	async getCadData() {
		const {baseURL, encode, data} = this;
		if (!data) {
			try {
				return [new CadData(this.loadCurrentCad())];
			} catch (error) {
				this.alert(error);
				return [new CadData()];
			}
		}
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getCadData"});
		try {
			const response = await this.http.get<Response>(`${baseURL}/peijian/cad/getCad/${encode}?data=${data}`).toPromise();
			if (response.code === 0 && response.data) {
				if (!Array.isArray(response.data)) {
					response.data = [response.data];
				}
				const result: CadData[] = [];
				response.data.forEach((d) => {
					result.push(new CadData(d));
				});
				return result;
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return [new CadData()];
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getCadData"});
		}
	}

	async postCadData(cadData: CadData[], data?: string) {
		const {baseURL, encode} = this;
		if (!data) {
			data = this.data;
		}
		if (cadData.length < 1) {
			return [];
		}
		const result: CadData[] = [];
		let counter = 0;
		let successCounter = 0;
		this.store.dispatch<LoadingAction>({
			type: ActionTypes.setLoadingProgress,
			name: "postCadData",
			progress: 0
		});
		return new Promise<CadData[]>((resolve) => {
			cadData.forEach(async (d, i) => {
				const formData = new FormData();
				if (data) {
					formData.append("data", data);
				}
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
				if (counter / cadData.length >= 1) {
					setTimeout(() => {
						this.store.dispatch<LoadingAction>({
							type: ActionTypes.setLoadingProgress,
							name: "postCadData",
							progress: -1
						});
					}, 200);
				}
				if (counter >= cadData.length) {
					if (successCounter === counter) {
						this.snackBar.open(`${successCounter > 1 ? "全部" : ""}成功`);
					} else {
						this.snackBar.open(`${counter > 1 ? (successCounter > 0 ? "部分" : "全部") : ""}失败`);
					}
					resolve(result);
				}
			});
		});
	}

	async getCadDataPage(page: number, limit: number, search?: string, zhuangpei = false) {
		const {baseURL, encode} = this;
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getCadDataPage"});
		try {
			const data = RSAEncrypt({page, limit, search, xiaodaohang: "CAD", zhuangpei});
			const response = await this.http.get<Response>(`${baseURL}/peijian/cad/getCad/${encode}?data=${data}`).toPromise();
			if (response.code === 0 && response.data) {
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
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getCadDataPage"});
		}
	}

	async replaceData(source: CadData, target: string) {
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getCadDataPage"});
		const {baseURL, encode} = this;
		try {
			const data = new FormData();
			data.append("data", RSAEncrypt({source: source.export(), target}));
			const response = await this.http.post<Response>(`${baseURL}/peijian/cad/replaceCad/${encode}`, data).toPromise();
			if (response.code === 0 && response.data) {
				this.snackBar.open(response.msg);
				return new CadData(response.data);
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getCadDataPage"});
		}
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
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getOptions"});
		const {baseURL, encode} = this;
		try {
			const formData = new FormData();
			const exportData = data.export();
			formData.append(
				"data",
				RSAEncrypt({
					name,
					search,
					page,
					limit,
					mingzi: exportData.name,
					fenlei: exportData.type,
					xuanxiang: exportData.options,
					tiaojian: exportData.conditions
				})
			);
			const response = await this.http.post<Response>(`${baseURL}/peijian/cad/getOptions/${encode}`, formData).toPromise();
			if (response.code === 0 && response.data) {
				return {data: response.data as string[], count: response.count};
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getOptions"});
		}
	}

	async getShowLineInfo() {
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getShowLineInfo"});
		const {baseURL, encode} = this;
		try {
			const response = await this.http.get<Response>(`${baseURL}/peijian/cad/showLineInfo/${encode}`).toPromise();
			if (response.code === 0) {
				return response.data as boolean;
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getShowLineInfo"});
		}
	}
}
