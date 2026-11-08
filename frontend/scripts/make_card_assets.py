# One-off build script: renders the user's card PDFs into the PNG assets the app uses.
import pymupdf as fitz
from PIL import Image
import io
OUT='/app/frontend/public/assets'
ids={
 'character':['char_solara','char_aquor','char_magmaros','char_zephyra','char_verdan'],
 'activation':['act_fire','act_wind','act_water','act_ice','act_lightning','act_earth','act_sunlight','act_magma','act_spore','act_catalyst'],
 'booster':['boost_double_strike','boost_armor_breaker','boost_overcharge','boost_power_surge','boost_energy_siphon','boost_eco_shield','boost_efficiency_core','boost_second_wind','boost_glass_cannon','boost_clear_skies'],
 'scenario':['scen_ocean','scen_desert','scen_volcanic_field','scen_rainforest','scen_mountain_peak','scen_arctic_tundra','scen_monsoon','scen_underground_cavern','scen_solar_eclipse','scen_drought'],
}
def render(page, zoom):
    pix=page.get_pixmap(matrix=fitz.Matrix(zoom,zoom), alpha=True)
    return Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
def save_q(im, path):
    im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)
for kind, lst in ids.items():
    d=fitz.open(f'/app/source_pdfs/{kind}.pdf')
    for i,cid in enumerate(lst):
        im=render(d[i],2.5)
        save_q(im, f'{OUT}/cards/{cid}.png')
        t=im.copy(); t.thumbnail((240,336)); t.save(f'{OUT}/cards/thumbs/{cid}.webp', quality=80)
        if kind=='character':
            big=render(d[i],3.0)
            w,h=big.size
            crop=big.crop((int(w*0.034),int(h*0.024),int(w*0.966),int(h*0.722)))
            crop.convert('RGB').save(f'{OUT}/characters/{cid}.png', optimize=True)
            print(cid, crop.size)
b=render(fitz.open('/app/source_pdfs/back.pdf')[0],2.5)
save_q(b, f'{OUT}/card_back.png')
t=b.copy(); t.thumbnail((240,336)); t.save(f'{OUT}/cards/thumbs/card_back.webp', quality=80)
