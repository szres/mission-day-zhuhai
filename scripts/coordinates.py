"""Normalize mainland-China source coordinates for MapKit's WGS-84 API."""
import math


def outside_china(lat, lng):
    return not (73.66 < lng < 135.05 and 3.86 < lat < 53.55)


def wgs84_to_gcj02(lat, lng):
    if outside_china(lat, lng):
        return lat, lng
    x, y = lng - 105.0, lat - 35.0
    dlat = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    dlng = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    wave = (20*math.sin(6*x*math.pi) + 20*math.sin(2*x*math.pi)) * 2/3
    dlat += wave + (20*math.sin(y*math.pi) + 40*math.sin(y/3*math.pi)) * 2/3
    dlat += (160*math.sin(y/12*math.pi) + 320*math.sin(y*math.pi/30)) * 2/3
    dlng += wave + (20*math.sin(x*math.pi) + 40*math.sin(x/3*math.pi)) * 2/3
    dlng += (150*math.sin(x/12*math.pi) + 300*math.sin(x/30*math.pi)) * 2/3
    rad = lat * math.pi / 180
    magic = 1 - 0.00669342162296594323 * math.sin(rad)**2
    a = 6378245.0
    dlat = dlat * 180 / ((a * (1 - 0.00669342162296594323)) / magic**1.5 * math.pi)
    dlng = dlng * 180 / (a / math.sqrt(magic) * math.cos(rad) * math.pi)
    return lat + dlat, lng + dlng


def gcj02_to_wgs84(lat, lng):
    if outside_china(lat, lng):
        return lat, lng
    wlat, wlng = lat, lng
    for _ in range(10):
        clat, clng = wgs84_to_gcj02(wlat, wlng)
        dlat, dlng = clat - lat, clng - lng
        wlat, wlng = wlat - dlat, wlng - dlng
        if max(abs(dlat), abs(dlng)) < 1e-9:
            break
    return wlat, wlng
