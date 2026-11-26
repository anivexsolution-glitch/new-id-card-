# ScholarCard Pro

This project includes 30 school ID card templates in CR80 proportions: 15 portrait and 15 landscape. Each design has a matching reverse side.

## View the designs

Extract the ZIP and open `Templates-Preview.html` in your browser. Select Portrait or Landscape to filter the collection. Select Show reverse sides to see the back designs.

## Run the generator

Use Node.js 22.12 or later. Open a terminal in this folder and run:

```sh
npm ci
npm run dev
```

Open the local address shown in the terminal. On the sign-in screen, use **Fill Demo Login**, then **Sign In to Dashboard**. Open **ID Card Designs** to choose a template.

To create a production build, run `npm run build`. The included `dist` folder contains the compiled application and can be served from the root of a static web server.
