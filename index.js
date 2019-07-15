/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = (app) => {
  const pathsToCheck = (process.env.PATH_TO_CHECK || '').trim().split(',');
  const pathsToCheckRegExp = pathsToCheck.map(filePath => new RegExp(`diff --git a/(.+?${filePath}.+?) b/(.+?${filePath}.+)`, 'g'));

  app.log('App configured to check the following paths: ', pathsToCheck);

  app.on('pull_request.opened', async (context) => {
    context.log('Pull request event handler triggered.');

    const { diff_url } = context.payload.pull_request;

    context.log('Fetching pull request diffs from: ', diff_url);
    const { data: diffs } = await context.github.request({ url: diff_url });
    context.log('These are the file diffs I got: ', diffs);

    context.log('Identifying expected file diffs...');
    let fileDiffs = [];
    pathsToCheckRegExp.forEach((regExp) => {
      const match = diffs.match(regExp);
      if (match) {
        fileDiffs = [...fileDiffs, ...match];
      }
    });

    context.log('Expected file diffs: ', fileDiffs);

    if (fileDiffs.length) {
      context.log('Identifying expected changed files');
      const fileChanges = fileDiffs.map(file => file.match(new RegExp('diff --git a/(.+?) '))[1]);
      context.log('These are the file changes:\n', fileChanges.join('\n'));

      const message = ''
        + 'Hi there!\n'
        + 'Please ensure that the file changes in the following components have the required story documents:'
        + '\n```\n'
        + fileChanges.join('\n')
        + '\n```\n'
        + 'Thanks.';
      context.log('Creating a comment on the PR...');
      const issueComment = context.issue({ body: message });
      return context.github.issues.createComment(issueComment);
    }
    context.log('There are no file changes... Event handler is done executing.');
  });
};
