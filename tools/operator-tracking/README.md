# Operator tracking

Narzędzie developerskie przygotowuje statyczny scenariusz czterech wskazanych
osób. OpenCV dekoduje film, propaguje ręczne ramki kontrolne przepływem
optycznym i generuje film kontrolny. Wynik każdej klatki musi zostać obejrzany;
automatyczne śledzenie nie zastępuje ręcznej weryfikacji.

Źródłowe obrazy A3 umieszcza się lokalnie w ignorowanym katalogu `source/` jako
`person-01.png`–`person-04.png`. Skrypt zapisuje wyłącznie zoptymalizowane WebP.

```powershell
python -m venv .venv-operator
.\.venv-operator\Scripts\python -m pip install -r tools/operator-tracking/requirements.txt
.\.venv-operator\Scripts\python tools/operator-tracking/build_scenario.py `
  --video public/video/film_2.mp4 `
  --keyframes tools/operator-tracking/keyframes.json `
  --output src/experience/operator-scenario.json `
  --preview tools/operator-tracking/operator-preview.mp4 `
  --assets-dir public/operator
```

`keyframes.json` przechowuje ramki w pikselach źródłowego obrazu 1920×1080.
Brak widoczności zapisuje się jako `null`. Preview, klatki robocze, źródłowe PNG
i środowisko Pythona są ignorowane przez Git.
