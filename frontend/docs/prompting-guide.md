# Building your app by talking to an AI

This project is set up so an AI assistant (Claude Code, Cursor, Copilot, ...) can
build features for you the same, tidy way every time. The rules it follows are in
`AGENTS.md`. You just describe what you want.

## The golden rules of a good request

1. **Say what the person using your app should see and do**, not how to code it.
   _"A page where I can see my orders, newest first, with the total and the date"_
   beats _"make an OrdersPage component with a map over an array"_.
2. **One feature at a time.** Check it works, then ask for the next thing.
3. **Mention the details you care about**: what fields, who can see it, what happens
   when you tap something, what to show when the list is empty.
4. **Look at the result** (`npm run dev`) and say what's wrong in plain words:
   _"the button is too small on my phone"_, _"the date shows in American format"_.
5. **When something breaks, paste the whole error** and the command you ran.

## Copy-paste examples

**A new page**

> Add a "Recipes" page to the menu. It shows recipes as cards with a title, a cooking
> time in minutes and a "vegetarian" badge. Use fake data with 6 realistic recipes.

**Click through to details**

> When I click a recipe card, open a page for that recipe with its ingredients and steps.

**A form**

> Add a "New recipe" button on the Recipes page that opens a form with title, minutes
> and a vegetarian checkbox. After saving, go back to the list and show the new recipe.

**Only for signed-in people**

> The Recipes page should only be visible after signing in.

**Search and filters**

> Add a search box above the recipes and a "vegetarian only" toggle.

**Look and feel**

> Change the main color to emerald and make the corners sharper.
> Make the home page feel more welcoming: a big title, a short description and two buttons.

**Mobile (Expo)**

> Add the Recipes screen to the phone app too, as a new tab.

**Connect a real server**

> My backend is at https://api.myapp.com/api/v1. Switch from fake data to it.
> (Claude Code: `/connect-backend https://api.myapp.com/api/v1`)

**Something broke**

> I ran `npm run dev` and got this error: (paste everything). Please fix it.
> (Claude Code: `/fix-error <paste>`)

**Understand something**

> Explain in simple words what happens when I press "Add" on the Todos page.

## Shortcuts in Claude Code

| Type                             | It does                                         |
| -------------------------------- | ----------------------------------------------- |
| `/new-page <what for>`           | Creates a page the right way and wires it in    |
| `/new-component <what it shows>` | Creates a reusable piece                        |
| `/new-api <kind of data>`        | Creates the data layer with fake data and hooks |
| `/connect-backend <url>`         | Switches from fake data to your server          |
| `/fix-error <error>`             | Finds and fixes the cause of an error           |

## Good habits

- Ask the AI to run `npm run check` after changes (it should do this anyway).
- Save your progress with git often: _"commit this with a short message"_.
- If the AI goes in circles, start a fresh conversation and describe the goal again.
