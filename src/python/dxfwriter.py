import ezdxf
import sys
import demjson


def isArray(v): return isinstance(v, (list, tuple))


def isObject(v): return isinstance(v, dict)


class DxfWriter:
    def saveDxf(self, dxfPath, data):
        layers = self.__getLayers(data)
        entities = self.__getEntities(data)
        dxf = ezdxf.new('R2013', setup=True)
        msp = dxf.modelspace()

        for layer in layers.values():
            try:
                dxf.layers.remove(layer['name'])
            except:
                pass
            dxf.layers.new(layer['name'], {'color': layer['color']})
        for line in entities['line'].values():
            msp.add_line(line['start'], line['end'], {
                         'layer': line['layer'], 'color': line['color']})
        for circle in entities['circle'].values():
            msp.add_circle(circle['center'], circle['radius'], {
                           'layer': line['layer'], 'color': line['color']})
        for arc in entities['arc'].values():
            msp.add_arc(arc['center'], arc['radius'], arc['start_angle'], arc['end_angle'],
                        arc['clockwise'], {'layer': line['layer'], 'color': line['color']})

        dxf.saveas(dxfPath)
        return dxf

    def __getLayers(self, data):
        result = {}
        if isObject(data.get('layers')):
            result.update(data['layers'])
        if isArray(data.get('partners')):
            for partner in data['partners']:
                result.update(self.__getLayers(partner))
        if isObject(data.get('components')) and isObject(data['components'].get('data')):
            for component in data['components']['data']:
                result.update(self.__getLayers(component))
        return result

    def __updateEntities(self, obj1, obj2):
        if obj1 is None:
            return {
                'line': {},
                'circle': {},
                'arc': {},
                'hatch': {},
                'mtext': {},
                'dimension': {}
            }
        for key in obj1:
            obj1[key].update(obj2[key])
        return obj1

    def __getEntities(self, data):
        result = self.__updateEntities(None, None)
        if isObject(data.get('entities')):
            self.__updateEntities(result, data['entities'])
        if isArray(data.get('partners')):
            for partner in data['partners']:
                self.__updateEntities(result, self.__getEntities(partner))
        if isObject(data.get('components')) and isObject(data['components'].get('data')):
            for component in data['components']['data']:
                self.__updateEntities(result, self.__getEntities(component))
        return result


def debug():
    writer = DxfWriter()
    file = open('./python/test/input.json', 'r')
    data = demjson.decode(file.read())
    writer.saveDxf('./python/test/output.dxf', data)
    print('done')


if len(sys.argv) < 2:
    debug()
