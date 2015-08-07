#!/usr/bin/env node

// use npm link to test this plugin while in dev

var http = require('http');
var fs = require('fs');
var commander = require('commander');
var chalk = require('chalk');
var prompt = require('cli-prompt');
var wp = require('wp-cli');

// Set up basic command line articles

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
                //console.error( chalk.red('Unable to parse WordPress Version from JSON. ' + error));
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


// Install wordPress

function installWordpress(){

    console.log(chalk.green(result.no_content_download)); 

    getLatestWordpress( function ( err,result ) {
        
        console.log(chalk.green(result.no_content_download)); 

        var file = fs.createWriteStream('wordpress.zip');
        
        var request = http.get(result.no_content_download, function(response) {
            
            response.pipe(file);
            file.on('finish', function() {
                file.close(callback);  // close() is async, call cb after close completes.
            });
        
        }).on('error', function (error) {
        
            //console.error(chalk.red('Error with request:', error.message));
            callback('Error with download of Wordpress: ', error.message);
        
        });
    });

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