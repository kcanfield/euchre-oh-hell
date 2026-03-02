import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { CompletedGameRecord, UserRecord } from '@oh-hell/shared';

export class DynamoDBService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly usersTable: string;
  private readonly gamesTable: string;

  constructor() {
    const region = process.env.AWS_REGION ?? 'us-east-2';
    this.usersTable = process.env.DYNAMODB_TABLE_USERS ?? 'oh-hell-users';
    this.gamesTable = process.env.DYNAMODB_TABLE_GAMES ?? 'oh-hell-games';

    const client = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async createUser(user: UserRecord): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.usersTable,
        Item: user,
      }),
    );
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.usersTable,
        IndexName: 'username-index',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': username,
        },
      }),
    );

    const items = result.Items;
    if (!items || items.length === 0) {
      return null;
    }

    return items[0] as UserRecord;
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.usersTable,
        Key: { userId },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return result.Item as UserRecord;
  }

  async saveCompletedGame(game: CompletedGameRecord): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.gamesTable,
        Item: game,
      }),
    );
  }

  async getGameHistory(gameId: string): Promise<CompletedGameRecord | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.gamesTable,
        Key: { gameId },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return result.Item as CompletedGameRecord;
  }
}
