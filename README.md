## Personal number

This web app provides you with a personal number associated with you account.
You can perform basic operations on the number (add/subtract/multiply/divide).
You can also see the operation history and change the value of any previous operation,
or delete operations from the history entirely.

Authentication (bother username/password and OAuth) is handled through passport.js, since 
it made OAuth very simple to implement. CSS is handled by Bootstrap, which I chose because it was the first name I recognized in the awesome CSS frameworks repository. 

The biggest challenge I faced in realizing this application was adapting my work from assignment3. My app for that assignment was a crowdsourced number shared by everyone, so there was no function to edit or delete operation history. Adding those operations, and especially the HTML forms to use them, took far more time than I had expected. 

The web app can be accessed at https://a3-dexter-haehnichen.onrender.com/

*Note*: I am aware this pull request was submitted late; I am hoping to use this as my one late assignment that the syllabus 

## Technical Achievements
- **Tech Achievement 1**: I used mongodb to store all user data to ensure persistance even if the server is restarted.
- **Tech Achievement 2**: I used OAuth authentication via the GitHub strategy with passport.js.
- **Tech Achievement 3**: The web app scores 100% in all four of the Best Practices, Accessibility, and SEO tests done by Google Lighthouse.
- **Tech Achievement 4**: Used several middleware packages including
  - passport.js for authentication
  - connect-mongo for passport.js to interface with the mongodb database holding user data

### Design/Evaluation Achievements
- **Design Achievement 1**: I used Bootstrap CSS for all CSS styling.