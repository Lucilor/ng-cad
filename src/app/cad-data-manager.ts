import {CadViewer, CadData, CadRawData, CadOption, CadLine, Dimension, CadTypes, CadDimension, MText, CadMText} from "@lucilor/cad-viewer";
import {SessionStorage, Point, Line, RSAEncrypt} from "@lucilor/utils";
import * as UUID from "uuid";
import {apiBasePath as defaultapiBaseBath, checkLogout} from "./app.common";
declare const layui: any;

const session = new SessionStorage("cad-data");
const alertError = () => {};
export class CadDataManager {
	private _rawData: CadRawData;
	private _mainData: CadData;
	apiBaseBath: string;
	constructor(apiBaseBath?: string) {
		if (!this._rawData) {
			this._rawData = {entities: [], layers: [], lineText: [], globalText: []};
		}
		const lineText = session.load("lineText", true);
		const globalText = session.load("globalText", true);
		if (Array.isArray(lineText)) {
			this._rawData.lineText = lineText;
			this._rawData.globalText = globalText;
		}
		this.apiBaseBath = apiBaseBath || defaultapiBaseBath;
	}

	private _getUUID() {
		const fragmentsData = (session.load("fragmentsData", true) as CadData[]) || [];
		let count = 0;
		const names = fragmentsData.map(v => v.name);
		while (count < 100) {
			const uuid = UUID.v1();
			if (!names.includes(uuid)) {
				return uuid;
			}
			count++;
		}
		return "";
	}

	get fragmentsData() {
		return (session.load("fragmentsData", true) || []) as CadData[];
	}

	updateFragments(fragments: CadData[]) {
		const fragmentsData = (this.fragmentsData || []) as CadData[];
		const ids = fragmentsData.map(v => v.id);
		const names = fragmentsData.map(v => v.name);
		const rawData = this.rawData;
		for (const f of fragments) {
			const idx = ids.indexOf(f.id);
			if (!f.id) {
				f.id = this._getUUID();
			}
			if (!f.name) {
				for (let i = 1; i <= fragmentsData.length + 1; i++) {
					const name = "Cad-" + i;
					if (!names.includes(name)) {
						f.name = name;
						break;
					}
				}
			}
			f.parent = rawData.id;
			f.dimensions = [];
			f.mtexts = [];
			const find = (id: string) => f.entities.find(e => e.id === id) as CadLine;
			const accuracy = 3;
			const used = [];
			for (const t of rawData.lineText) {
				const length = t.text.to.length;
				if (length < 1 || length > 4) {
					// console.warn(t);
					continue;
				}
				if (t.type === CadTypes.MText || length === 1) {
					const match = t.text.text?.match(/#/g);
					if (t.type === CadTypes.MText && match && match.length > 1) {
						const entity = find(t.text.to[0]);
						if (entity) {
							const mtext: MText = {entity: entity.id, distance: 0, fontSize: t.font_size, text: t.text.text};
							const insert = new Point((t as CadMText).insert);
							const line = new Line(new Point(entity.start), new Point(entity.end));
							mtext.distance = line.distance(insert);
							f.mtexts.push(mtext);
						}
					} else {
						t.text.to.forEach(id => {
							if (used.includes(t.id)) {
								return;
							}
							const line = find(id);
							if (line) {
								if (!line.mingzi) {
									line.mingzi = t.text.mingzi;
								}
								if (!line.qujian) {
									line.qujian = t.text.qujian;
								}
								if (!line.gongshi) {
									line.gongshi = t.text.gongshi;
								}
								used.push(t.id);
							}
						});
					}
				} else if (t.type === CadTypes.Dimension) {
					const d = t as CadDimension;
					const p1 = new Point(d.defpoint2);
					const p2 = new Point(d.defpoint3);
					const dimension: Dimension = {
						axis: null,
						entity1: null,
						entity2: null,
						distance: 0,
						mingzi: d.text.mingzi || "",
						qujian: d.text.qujian || "",
						fontSize: d.font_size,
						dimstyle: d.dimstyle
					};
					const sub = new Point(d.defpoint).sub(new Point(d.defpoint3));
					if (Math.abs(sub.x) < 0.1) {
						dimension.axis = "x";
						dimension.distance = sub.y;
					} else if (Math.abs(sub.y) < 0.1) {
						dimension.axis = "y";
						dimension.distance = sub.x;
					} else {
						const sub2 = new Point(d.defpoint).sub(new Point(d.defpoint2));
						if (Math.abs(sub2.x) < 0.1) {
							dimension.axis = "x";
							dimension.distance = sub2.y;
						} else if (Math.abs(sub2.y) < 0.1) {
							dimension.axis = "y";
							dimension.distance = sub2.x;
						} else {
							console.warn("invalid defpoints", t);
							continue;
						}
					}
					const set = (e: CadLine) => {
						if (!e) {
							return;
						}
						const start = new Point(e.start);
						const end = new Point(e.end);
						if (p1.equalsAppr(start, accuracy)) {
							dimension.entity1 = {id: e.id, location: "start"};
						}
						if (p1.equalsAppr(end, accuracy)) {
							dimension.entity1 = {id: e.id, location: "end"};
						}
						if (p2.equalsAppr(start, accuracy)) {
							dimension.entity2 = {id: e.id, location: "start"};
						}
						if (p2.equalsAppr(end, accuracy)) {
							dimension.entity2 = {id: e.id, location: "end"};
						}
					};
					if (length === 2 || length === 4) {
						t.text.to.forEach(id => set(find(id)));
						if (dimension.entity1 || dimension.entity2) {
							if (dimension.entity1) {
								dimension.cad1 = f.id;
							}
							if (dimension.entity2) {
								dimension.cad2 = f.id;
							}
							f.dimensions.push(dimension);
						}
					}
					if (length === 3) {
						for (const id of t.text.to) {
							const line = find(id);
							if (line) {
								const start = new Point(line.start);
								const end = new Point(line.end);
								if (
									(p1.equalsAppr(start, accuracy) && p2.equalsAppr(end, accuracy)) ||
									(p2.equalsAppr(start, accuracy) && p1.equalsAppr(end, accuracy))
								) {
									if (!line.mingzi) {
										line.mingzi = t.text.mingzi;
									}
									if (!line.qujian) {
										line.qujian = t.text.qujian;
									}
									if (!line.gongshi) {
										line.gongshi = t.text.gongshi;
									}
								}
							}
						}
					}
				}
			}
			// console.log(f.dimensions);
			if (idx > -1) {
				fragmentsData[idx] = f;
			} else {
				fragmentsData.push(f);
			}
		}
		session.save("fragmentsData", fragmentsData);
		return fragmentsData;
	}

	removeFragments(fragments: CadData[]) {
		let fragmentsData = (session.load("fragmentsData", true) as CadData[]) || [];
		const names = fragments.map(v => v.name);
		fragmentsData = fragmentsData.filter(f => !names.includes(f.name));
		session.save("fragmentsData", fragmentsData);
		return fragmentsData;
	}

	get rawData() {
		return this._rawData;
	}

	set rawData(value) {
		this._rawData = value;
		this._mainData = value;
		session.save("lineText", value.lineText);
		session.save("globalText", value.globalText);
	}

	get lineText() {
		return this.rawData.lineText;
	}

	set lineText(value) {
		this.rawData = {...this.rawData, lineText: value};
		session.save("lineText", value);
	}

	get globalText() {
		return this.rawData.globalText;
	}

	set globalText(value) {
		this.rawData = {...this.rawData, globalText: value};
		session.save("globalText", value);
	}

	get mainData() {
		return this._mainData;
	}

	set mainData(value) {
		this._mainData = value;
	}

	get currentFragment() {
		return session.load("currentFragmentData", true) as CadData;
	}

	set currentFragment(value) {
		session.save("currentFragmentData", value);
	}

	// async fetchRawData(data: string) {
	// 	const index = layui.layer.load(2, {shade: [0.5, "#000000"]});
	// 	try {
	// 		const response = await Axios.get(`${this.apiBaseBath}peijian/cad/read_dxf_file?data=${data}`);
	// 		checkLogout(response.data);
	// 		if (response.data.code === 0) {
	// 			const rawData = response.data.data;
	// 			this.transformData(rawData, "array");
	// 			// rawData.entities = rawData.entities.slice(0, 8000);
	// 			this.rawData = rawData;
	// 			return rawData as CadData;
	// 		} else {
	// 			alertError(response.data.msg);
	// 			return null;
	// 		}
	// 	} catch (error) {
	// 		alertError("获取数据失败。请确认网络和登录状态。");
	// 		console.warn(error);
	// 		return null;
	// 	} finally {
	// 		layui.layer.close(index);
	// 	}
	// }

	// async fetchCadData(data: string, encode?: string) {
	// 	const index = layui.layer.load(2, {shade: [0.5, "#000000"]});
	// 	if (encode) {
	// 		if (encode.startsWith("%22")) {
	// 			encode = encode.slice(3);
	// 		}
	// 		if (encode.endsWith("%22")) {
	// 			encode = encode.slice(0, -3);
	// 		}
	// 	}
	// 	try {
	// 		const response = await Axios.get(`${this.apiBaseBath}peijian/cad/getCad${encode ? "/" + encode : ""}?data=${data}`);
	// 		if (response.status !== 200 || response.data.code !== 0) {
	// 			throw new Error(response.data.msg);
	// 		}
	// 		checkLogout(response.data);
	// 		if (response.data.data) {
	// 			const {分类, 名字, 条件, 选项} = response.data.data;
	// 			const json = response.data.data.json as CadData;
	// 			if (!json.entities) {
	// 				json.entities = [];
	// 			}
	// 			if (!json.layers) {
	// 				json.layers = [];
	// 			}
	// 			json.name = 名字;
	// 			json.type = 分类;
	// 			json.options = 选项;
	// 			json.conditions = 条件;
	// 			this.transformData(json, "array");
	// 			this.currentFragment = json;
	// 			return json;
	// 		} else {
	// 			alertError(response.data.msg);
	// 			return null;
	// 		}
	// 	} catch (error) {
	// 		alertError(error);
	// 		console.warn(error);
	// 		return null;
	// 	} finally {
	// 		layui.layer.close(index);
	// 	}
	// }

	// async postRawData(data: CadRawData) {
	// 	const index = layui.layer.load(2, {shade: [0.5, "#000000"]});
	// 	const formData = new FormData();
	// 	formData.append("data", RSAEncrypt({vid: data.id}));
	// 	try {
	// 		const response = await Axios.post(this.apiBaseBath + "peijian/cad/update_cad_file", formData);
	// 		checkLogout(response.data);
	// 		if (response.status !== 200 || response.data.code !== 0) {
	// 			throw new Error(response.data.msg);
	// 		}
	// 		this.rawData = data;
	// 		layui.layer.msg(response.data.msg);
	// 		return true;
	// 	} catch (error) {
	// 		alertError(error);
	// 		return false;
	// 	} finally {
	// 		layui.layer.close(index);
	// 	}
	// }

	// async postCadData(cadData: CadData, encode?: string, data?: string) {
	// 	const formData = new FormData();
	// 	this.transformData(cadData, "object");
	// 	if (data) {
	// 		formData.append("data", data);
	// 	}
	// 	if (encode) {
	// 		if (encode.startsWith("%22")) {
	// 			encode = encode.slice(3);
	// 		}
	// 		if (encode.endsWith("%22")) {
	// 			encode = encode.slice(0, -3);
	// 		}
	// 	}
	// 	formData.append("cadData", JSON.stringify(cadData));
	// 	const index = layui.layer.load(2, {shade: [0.5, "#000000"]});
	// 	try {
	// 		const response = await Axios.post(`${this.apiBaseBath}peijian/cad/setCAD${encode ? "/" + encode : ""}`, formData);
	// 		checkLogout(response.data);
	// 		if (response.status !== 200 || response.data.code !== 0) {
	// 			throw new Error(response.data.msg);
	// 		}
	// 		layui.layer.msg(response.data.msg);
	// 		const {json, 分类, 名字, 条件, 选项} = response.data.data;
	// 		if (!json) {
	// 			return null;
	// 		}
	// 		json.name = 名字;
	// 		json.type = 分类;
	// 		json.options = 选项;
	// 		json.conditions = 条件;
	// 		this.transformData(json, "array");
	// 		const currentFragment = json as CadData;
	// 		this.currentFragment = currentFragment;
	// 		return currentFragment;
	// 	} catch (error) {
	// 		alertError(error);
	// 		console.warn(error);
	// 		return null;
	// 	} finally {
	// 		layui.layer.close(index);
	// 	}
	// }

	saveViewerStatus(viewer: CadViewer, field: string) {
		const status = {position: viewer.getPosition(), scale: viewer.getScale(), id: viewer.data.id};
		session.save(field, status);
		return status;
	}

	loadViewerStatus(viewer: CadViewer, field: string) {
		const status = session.load(field, true);
		if (status && status.id === viewer.data.id) {
			if (status.position) {
				viewer.setPosition(new Point(status.position.x, status.position.y));
			}
			if (status.scale) {
				viewer.setScale(status.scale);
			}
			return status;
		} else {
			return null;
		}
	}
}
