brand_map = {
    '日産': 'Nissan',
    'スズキ': 'Suzuki',
    'ダイハツ': 'Daihatsu',
    '三菱': 'Mitsubishi',
    'ホンダ': 'Honda',
    'マツダ': 'Mazda',
}

color_map = {
    '黒': 'black',
    '白': 'white',
    '真珠白': 'pearl white',
    '銀': 'silver',
    '銀Ｍ': 'metallic silver',
    '青': 'blue',
}

spec_key_map = {
    '年式': 'year',
    '走行距離': 'mileage',
    '車検': 'inspection',
    '修復歴': 'repair_history',
    '保証': 'warranty',
    '整備': 'maintenance',
    '排気量': 'engine_cc',
    'ミッション': 'transmission',
}

spec_value_map = {
    'なし': 'none',
    '保証付': 'included',
    '法定整備付': 'included',
    '法定整備無': 'not_included',
    '保証無': 'not_included',
}

body_type_map = {
    'ハッチバック': 'hatchback',
    'クロカン・ＳＵＶ': 'suv',
    '軽自動車': 'kei_car',
}

transmission_map = {
    'インパネCVT': 'cvt',
    'CVT': 'cvt',
    'インパネ6MT': 'manual',
    'MT': 'manual',
    'AT': 'automatic',
}

feature_map = {
    'LEDヘッドライト': 'led_headlights',
    'バックカメラ': 'rear_camera',
    '全周囲カメラ': '360_camera',
    'スマートキー': 'smart_key',
    'シートヒーター': 'seat_heater',
    'レーダークルーズ': 'adaptive_cruise_control',
    'クルーズコントロール': 'cruise_control',
    '衝突被害軽減ブレーキ': 'collision_mitigation',
    '車線逸脱警報': 'lane_departure_warning',
    '両側電動スライドドア': 'dual_power_sliding_doors',
    '電動スライドドア': 'power_sliding_door',
    'オートライト': 'auto_lights',
    'オートエアコン': 'auto_ac',
    'Bluetooth': 'bluetooth',
}

class Types:
    BRAND = 'brand'
    COLOR = 'color'
    SPEC_KEY = 'specKey'
    SPEC_VALUE = 'specValue'
    BODY_TYPE = 'body_type'
    TRANSMISSION = 'transmission'
    FEATURE = 'feature'

types = Types()

_type_map = {
    types.BRAND: brand_map,
    types.COLOR: color_map,
    types.SPEC_KEY: spec_key_map,
    types.SPEC_VALUE: spec_value_map,
    types.BODY_TYPE: body_type_map,
    types.TRANSMISSION: transmission_map,
    types.FEATURE: feature_map,
}