import ezdxf
import sys
import demjson


def isArray(v): return isinstance(v, (list, tuple))


def isObject(v): return isinstance(v, dict)


class DxfWriter:
    def saveDxf(self, dxfPath, data):
        dxf = ezdxf.new('R2013', setup=True)
        layers = self.__getLayers(data)
        for layer in layers.values():
            if layer['name'] == 'Defpoints':
                continue
            try:
                dxf.layers.remove(layer['name'])
            except:
                pass
            dxf.layers.new(layer['name'], {'color': layer['color']})
        allEntities = self.__getEntities(data)
        self.__draw(dxf, data, allEntities)
        for component in data['components']['data']:
            self.__draw(dxf, component, allEntities)
        for partner in data['partners']:
            self.__draw(dxf, partner, allEntities)

        dxf.saveas(dxfPath)
        return dxf

    def __draw(self, dxf, data, allEntities):
        msp = dxf.modelspace()
        entities = data['entities']
        for line in entities['line'].values():
            msp.add_line(line['start'], line['end'], {
                         'layer': line['layer'], 'color': line['color']})
        for circle in entities['circle'].values():
            msp.add_circle(circle['center'], circle['radius'], {
                           'layer': line['layer'], 'color': line['color']})
        for arc in entities['arc'].values():
            msp.add_arc(arc['center'], arc['radius'], arc['start_angle'], arc['end_angle'],
                        not arc['clockwise'], {'layer': line['layer'], 'color': line['color']})
        for mtext in entities['mtext'].values():
            msp.add_mtext(mtext['text'], {
                          'layer': line['layer'], 'color': line['color'], 'insert': mtext['insert']})

        def getPoint(line, location):
            start = line['start']
            end = line['end']
            if location == 'start':
                return start
            if location == 'end':
                return end
            if location == 'center':
                return [(start[0]+end[0])/2, (start[1]+end[1])/2]
        for dimension in entities['dimension'].values():
            p1 = None
            p2 = None
            if dimension.get('entity1') and dimension['entity1'].get('id') and dimension['entity1'].get('location'):
                line1 = allEntities['line'][dimension['entity1']['id']]
                p1 = getPoint(line1, dimension['entity1']['location'])
            if dimension.get('entity2') and dimension['entity2'].get('id'):
                line2 = allEntities['line'][dimension['entity2']['id']]
                p2 = getPoint(line2, dimension['entity2']['location'])
            if p1 and p2:
                distance = float((dimension['distance']))
                x = max(p1[0], p2[0])+distance
                y = max(p1[1], p2[1])+distance
                if dimension['axis'] == 'x':
                    p0 = [p1[0], y, p1[2]]
                if dimension['axis'] == 'y':
                    p0 = [x, p1[1], p1[2]]
                text = dimension['mingzi']
                if dimension['qujian']:
                    text += ' '+dimension['qujian']
                dim = msp.add_linear_dim(p0, p1, p2, text=text, dimstyle=dimension['dimstyle'], dxfattribs={
                    'layer': dimension['layer']})
                dim.dimension.get_dim_style(
                ).dxf.dimtxt = dimension['font_size']
                dim.render()
        for hatch in entities['hatch'].values():
            entity = msp.add_hatch(hatch['color'], {'layer': hatch['layer']})
            if hatch.get('bgcolor'):
                entity.bgcolor = hatch['bgcolor']
            else:
                entity.bgcolor = (0, 0, 0)
            with entity.edit_boundary() as boundary:
                for path in hatch['paths']:
                    if len(path['edges']):
                        edgePath =  boundary.add_edge_path()
                        for edge in path['edges']:
                            edgePath.add_line(edge['start'], edge['end'])
                    boundary.add_polyline_path(path['vertices'])

    def __getLayers(self, data):
        result = {}
        if isObject(data.get('layers')):
            result.update(data['layers'])
        if isArray(data.get('partners')):
            for partner in data['partners']:
                result.update(self.__getLayers(partner))
        if isObject(data.get('components')) and isArray(data['components'].get('data')):
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
        if isObject(data.get('components')) and isArray(data['components'].get('data')):
            for component in data['components']['data']:
                self.__updateEntities(result, self.__getEntities(component))
        return result


def debug():
    writer = DxfWriter()
    with open('./python/test/input.json', 'r', encoding='utf-8') as file:
        file = open('./python/test/input.json', 'r', encoding='utf-8')
        data = demjson.decode(file.read())
        writer.saveDxf('./python/test/output.dxf', data)
        print('done')


if len(sys.argv) < 2:
    debug()
