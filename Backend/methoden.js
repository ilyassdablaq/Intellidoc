const fs = require("fs");
const path = require("path");

// Route zum Erstellen eines neuen Verzeichnisses
router.post("/create-directory", (req, res) => {
    const directoryName = req.body.directoryName;
    const dirPath = path.join(__dirname, directoryName);

   fs.access(path, (error) => {

        // To check if the given directory 
        // already exists or not
        if (error) {
            // If current directory does not exist
            // then create it
            fs.mkdir(path, (error) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log("New Directory created successfully !!");
                }
            });
        } else {
            console.log("Given Directory already exists !!");
        }
    });
});