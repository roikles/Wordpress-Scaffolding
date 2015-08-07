#!/usr/bin/env node

// use npm link to test this plugin while in dev
var db = require('node-mysql');
var fs = require('fs');
var wp = require('wp-cli');
var http = require('http');
var chalk = require('chalk');
var prompt = require('cli-prompt');
var commander = require('commander');
var unzip = require('decompress-zip');


// Set up basic command line args
commander
    .version('1.0.0')
    .option('-i, --install', 'relative path to the stylesheet to process')
    .option('-h, --help', 'get help on the plugin')
    .option('-v, --version', 'get information on the latest WordPress release.')
    .parse(process.argv);

// Lets set up some default Vars

//var wp_version      = '4.2.4';
var wp_custom_dir   = false;
var wp_theme        = 'https://github.com/roikles/Flexbones/archive/master.zip';
var wp_user         = 'root';
var wp_pass         = 'root';
var wp_folder       = 'project-folder';
var wp_url          = 'http://localhost/' + wp_folder;
var wp_title        = 'Project Title';
var wp_email        = 'me@example.com';

// Database details
var wp_db_name      = 'db-name';
var wp_db_host      = 'localhost';
var wp_db_user      = 'user';
var wp_db_pass      = 'pass';


/**
 * Handle all errors through a single 
 * callback function
 */

function callback (error, data) {
    if(error) {
        console.log(chalk.red(error));
        return;
    }
    return data;
}


/**
 * getWpVersionInfo - gets the lates WordPress version and download links
 * @param  {Function} cb Callback function that is neccessary for data and errors
 * @return {Object}   Thisreturns selected data extracted from the api/json request
 */
function getLatestWordpress (callback){
    // Pass the API details to the http.get method
    http.get({
        host: 'api.wordpress.org',
        path: '/core/version-check/1.7/'
    }, function(response) {
        // Ensure we get a usable encoded file
        response.setEncoding('utf8');
        // Instantiate body as a blank var
        var body = '';
        
        // Collect all the Async data into the body var
        response.on('data', function (chunk) {
            body += chunk;       
        });
        // On async completion parse the JSON or handle any parsing errors that arise
        response.on('end', function () {
            try {
                jsonData = JSON.parse(body);
            } catch (error){
                callback( 'Unable to parse WordPress Version from JSON. ' + error );
            }

            callback(null, {
                version:             "Latest Version: " + jsonData.offers[0].current,
                full_download:       jsonData.offers[0].packages.full,
                no_content_download: jsonData.offers[0].packages.no_content 
            });

        });

    // Handle any errors with the request
    }).on('error', function (error) {
        //console.error(chalk.red('Error with request:', error.message));
        callback('Error with request: ', error.message);
    });

}


/*getLatestWordpress(function (err,result){
   console.log(chalk.green(result.version));
   console.log(chalk.green(result.full_download));
   console.log(chalk.green(result.no_content_download)); 
});*/


function createDirectories(customDirStructure){

    if(customDirStructure){
        
        fs.mkdirSync('./wordpress');
        console.log(chalk.green('Directory created /wordpress'));
        fs.mkdirSync('./wp-content');
        console.log(chalk.green('Directory created /wp-content'));
        
        fs.mkdirSync('./wp-content/themes');
        console.log(chalk.green('Directory created /wp-content/themes'));
        
        fs.mkdirSync('./wp-content/plugins');
        console.log(chalk.green('Directory created /wp-content/plugins'));
        

        fs.writeFileSync('./wp-content/index.php', '<?php\r\n// Silence is golden.');
        
    } else {
        // default install Jazz.
    }

}

//createDirectories(true);


// Unzippy in a jiffy
function extractWordpress(wp_zip){
    
    // create a Wordpress directory (ties in to the custom dir structure stuff)
    //fs.mkdirSync('./wordpress');

    var unzipper = new unzip(wp_zip);

    unzipper.on('error', function (err) {
        callback(error.message);
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
        console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.on('extract', function (log) {
        console.log(chalk.green('Finished extracting Wordpress!'));
        fs.unlink(wp_zip, function (err) {
            callback(null, console.log( chalk.yellow( 'removed ' + wp_zip) ) );
        });
    });

    unzipper.extract({
        path: './',
    });

}


// Download wordPress

function downloadWordpress(){

    //console.log(chalk.green(result.no_content_download)); 

    getLatestWordpress( function ( err,result ) {
        
        console.log( chalk.yellow( 'Downloading ' + result.no_content_download ) ); 

        var zip_name = 'wordpress.zip';

        var file = fs.createWriteStream(zip_name);
        
        var request = http.get(result.no_content_download, function(response) {
            
            response.pipe(file);
            file.on('close', function() {
                file.close();  // close() is async, call cb after close completes.
                console.log( chalk.green( callback( null,'Wordpress Downloaded successfully!' ) ) ); 
                // ^Remember to include console.logs() because callback will just output any old data and doesnt parse it.
                extractWordpress(zip_name);
            });
        
        }).on('error', function (error) {
        
            callback('Error with download of Wordpress: ', error.message);
        
        });
    });

}

function createDatabase(){

}

function installWordpress(){
    createDirectories(true);
    downloadWordpress();
}

installWordpress();

/*prompt.multi([
    {
        label: 'Which version of Wordpress do you want to use',
        key: 'version',
        type: 'string',
        validate: function (val) {
            if (val.length !== 0){ var wp_version = val; }
        }
    }
], console.log);*/