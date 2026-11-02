# Trip packing checklist

Use this page to add items to fixed categories, mark items as packed, filter the list, and see the overall progress. The list stays in the browser.

## How to open

Open `index.html` directly in a browser, or serve this folder with a static HTTP server.

Example: run `python3 -m http.server 8000` in this folder. Then open http://localhost:8000/.

## Storage

The page keeps the list in the localStorage key `startino.trip-packing-checklist.v1`.

The value is a JSON array of entries. Each entry has exactly these fields:

- `id`: non-empty string.
- `name`: string, non-empty after trim.
- `category`: one of `Clothes`, `Toiletries`, `Documents`, `Electronics`, `Health`, `Other`.
- `packed`: boolean.

```json
[{ "id": "a1", "name": "Passport", "category": "Documents", "packed": false }]
```

On read, the page applies these controls:

- Corrupt JSON gives an empty list.
- A value that is not an array gives an empty list.
- The page drops an entry that has the wrong shape.
- The page drops an entry that has a repeated `id`.
- The page drops an entry if its name repeats another name in the same category. This comparison is case-insensitive.
- A notice tells the user that the page dropped saved data.
- The page writes the cleaned list back.

If localStorage throws an error, the page continues in memory and shows a small notice. The list is then lost when the page closes.
