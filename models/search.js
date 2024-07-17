const express = require('express');
const router = express.Router();
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({ node: 'https://localhost:9200' });

// Middleware to check if the user is authenticated
async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.redirect('/login');
            }
            req.user = user;
            return next();
        } catch (error) {
            console.error('Error fetching user:', error);
            return res.redirect('/login');
        }
    } else {
        return res.redirect('/login');
    }
}

// Search route
router.get('/search', isAuthenticated, async (req, res) => {
    const query = req.query.q;

    try {
        const { body } = await esClient.search({
            index: 'documents',
            body: {
                query: {
                    bool: {
                        must: [
                            { match: { user_id: req.user._id } },
                            { match: { content: query } }
                        ]
                    }
                }
            }
        });

        res.json(body.hits.hits.map(hit => hit._source));
    } catch (error) {
        console.error(`Search error: ${error}`);
        res.status(500).send('Search error');
    }
});

module.exports = router;
